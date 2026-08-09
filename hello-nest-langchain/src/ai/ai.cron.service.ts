import { Inject, Injectable } from '@nestjs/common';
import { CreateAiDto } from './dto/create-ai.dto';
import { UpdateAiDto } from './dto/update-ai.dto';
import {
  PromptTemplate,
} from '@langchain/core/prompts';
import { Runnable } from "@langchain/core/runnables";
import { StringOutputParser } from '@langchain/core/output_parsers';
import { ChatOpenAI } from '@langchain/openai';
import { ConfigService } from '@nestjs/config';
import z from 'zod'
import { Tool, tool } from '@langchain/core/tools';
import { AIMessage, AIMessageChunk, BaseMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';



const database = {
  users: {
    '001': { id: '001', name: '张三', email: 'zhangsan@example.com', role: 'admin' },
    '002': { id: '002', name: '李四', email: 'lisi@example.com', role: 'user' },
    '003': { id: '003', name: '王五', email: 'wangwu@example.com', role: 'user' },
  },
};

const queryUserArgsSchema = z.object({
  userId: z.string().describe('用户 ID，例如: 001, 002, 003'),
});

type QueryUserArgs = {
  userId: string;
};

// const queryUserTool = tool(
//   async ({ userId }: QueryUserArgs) => {
//     const user = database.users[userId];

//     if (!user) {
//       return `用户 ID ${userId} 不存在。可用的 ID: 001, 002, 003`;
//     }

//     return `用户信息：\n- ID: ${user.id}\n- 姓名: ${user.name}\n- 邮箱: ${user.email}\n- 角色: ${user.role}`;
//   },
//   {
//     name: 'query_user',
//     description:
//       '查询数据库中的用户信息。输入用户 ID，返回该用户的详细信息（姓名、邮箱、角色）。',
//     schema: queryUserArgsSchema,
//   },
// );




@Injectable()
export class AiCronService {
  private readonly modelWithTools: Runnable<BaseMessage[], AIMessage>;

  constructor(
    @Inject('CHAT_MODEL') model: ChatOpenAI,
    @Inject('QUERY_USER_TOOL') private readonly queryUserTool: Tool,
    @Inject('SEND_MAIL_TOOL') private readonly sendMailTool: Tool,
    @Inject('WEB_SEARCH_TOOL') private readonly webSearchTool: Tool,
    @Inject('DB_USERS_CRUD_TOOL') private readonly dbUsersCrudTool: Tool,
    @Inject('TIME_NOW_TOOL') private readonly timeNowTool: any,
    @Inject('CRON_JOB_TOOL') private readonly cronJobTool: Tool,
  ) {
    this.modelWithTools = model.bindTools([
      queryUserTool,
      sendMailTool,
      webSearchTool,
      dbUsersCrudTool,
      timeNowTool,
      cronJobTool,
    ])
  }


  async runChain(query: string): Promise<string> {
    const messages: BaseMessage[] = [
      new SystemMessage(
        `你是一个通用任务助手，可以根据用户的目标规划步骤，并在需要时调用工具：\`query_user\` 查询或校验用户信息、\`send_mail\` 发送邮件、\`web_search\` 进行互联网搜索、\`db_users_crud\` 读写数据库 users 表、\`time_now\` 获取当前服务器时间、\`cron_job\` 创建和管理定时/周期任务（\`list\`/\`add\`/\`toggle\`），从而实现提醒、定期任务、数据同步等各种自动化需求。

定时任务类型选择规则（非常重要）：
- 用户说“X分钟/小时/天后”“在某个时间点”“到点提醒”（一次性）=> 用 \`cron_job\` + \`type=at\`（执行一次后自动停用），\`at\`=当前时间+X 或解析出的时间点
- 用户说“每X分钟/每小时/每天”“定期/循环/一直”（重复执行）=> 用 \`cron_job\` + \`type=every\`（每次执行），\`everyMs\`=X换算成毫秒
- 用户给出 Cron 表达式或明确说“用 cron 表达式”（重复执行）=> 用 \`cron_job\` + \`type=cron\`

在调用 \`cron_job.add\` 创建任务时，需要把用户原始自然语言拆成两部分：一部分是“什么时候执行”（用来决定 type/at/everyMs/cron），另一部分是“要做什么任务本身”。\`instruction\` 字段只能填“要做什么”的那部分文本（保持原语言和原话），不能再改写、翻译或总结。

当用户请求“在未来某个时间点执行某个动作”（例如“1分钟后给我发一个笑话到邮箱”）时，本轮对话只需要使用 \`cron_job\` 设置/更新定时任务，不要在当前轮直接完成这个动作本身：不要直接调用 \`send_mail\` 给他发邮件，也不要在当前轮就真正“执行”指令，只需把要执行的动作写进 \`instruction\` 里，交给将来的定时任务去跑。

重要：\`cron_job.add\` 的 \`instruction\` 必须是自然语言任务描述，不能写成工具调用/脚本（例如禁止 \`send_mail(...)\`、\`db_users_crud(...)\`、\`web_search(...)\`）。工具调用应该由将来的 JobAgent 在执行时自行决定。

注意：像“\`1分钟后提醒我喝水\`”，时间相关信息用于计算下一次执行时间，而 \`instruction\` 应该是“提醒我喝水”；本轮不需要立刻提醒。`
      ),
      new HumanMessage(query)
    ]

    while (true) {
      const aiMessage = await this.modelWithTools.invoke(messages)

      messages.push(aiMessage)

      const toolCalls = aiMessage.tool_calls || []
      if (!toolCalls.length) {
        return aiMessage.content as string
      }

      for (const toolCall of toolCalls) {
        if (toolCall.name === 'query_user') {
          const args = queryUserArgsSchema.parse(toolCall.args)
          const result = await this.queryUserTool.invoke(args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'send_mail') {
          const result = await this.sendMailTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'web_search') {
          const result = await this.webSearchTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'db_user_crud') {
          const result = await this.dbUsersCrudTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'time_now') {
          const result = await this.timeNowTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          );
        } else if (toolCall.name === 'cron_job') {
          const result = await this.cronJobTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        }
      }
    }
  }

  async *runChainStream(query: string): AsyncIterable<string> {
    const messages: BaseMessage[] = [
      new SystemMessage(
        `你是一个通用任务助手，可以根据用户的目标规划步骤，并在需要时调用工具：\`query_user\` 查询或校验用户信息、\`send_mail\` 发送邮件、\`web_search\` 进行互联网搜索、\`db_users_crud\` 读写数据库 users 表、\`time_now\` 获取当前时间、\`cron_job\` 创建和管理定时/周期任务（\`list\`/\`add\`/\`toggle\`），从而实现提醒、定期任务、数据同步等各种自动化需求。

定时任务类型选择规则（非常重要）：
- 用户说“X分钟/小时/天后”“在某个时间点”“到点提醒”（一次性）=> 用 \`cron_job\` + \`type=at\`（执行一次后自动停用），\`at\`=当前时间+X 或解析出的时间点
- 用户说“每X分钟/每小时/每天”“定期/循环/一直”（重复执行）=> 用 \`cron_job\` + \`type=every\`（每次执行），\`everyMs\`=X换算成毫秒
- 用户给出 Cron 表达式或明确说“用 cron 表达式”（重复执行）=> 用 \`cron_job\` + \`type=cron\`

在调用 \`cron_job.add\` 创建任务时，需要把用户原始自然语言拆成两部分：一部分是“什么时候执行”（用来决定 type/at/everyMs/cron），另一部分是“要做什么任务本身”。\`instruction\` 字段只能填“要做什么”的那部分文本（保持原语言和原话），不能再改写、翻译或总结。

当用户请求“在未来某个时间点执行某个动作”（例如“1分钟后给我发一个笑话到邮箱”）时，本轮对话只需要使用 \`cron_job\` 设置/更新定时任务，不要在当前轮直接完成这个动作本身：不要直接调用 \`send_mail\` 给他发邮件，也不要在当前轮就真正“执行”指令，只需把要执行的动作写进 \`instruction\` 里，交给将来的定时任务去跑。

重要：\`cron_job.add\` 的 \`instruction\` 必须是自然语言任务描述，不能写成工具调用/脚本（例如禁止 \`send_mail(...)\`、\`db_users_crud(...)\`、\`web_search(...)\`）。工具调用应该由将来的 JobAgent 在执行时自行决定。

注意：像“\`1分钟后提醒我喝水\`”，时间相关信息用于计算下一次执行时间，而 \`instruction\` 应该是“提醒我喝水”；本轮不需要立刻提醒。`
      ),
      new HumanMessage(query)
    ]

    while (true) {
      console.log('[llm正在思考]------')
      // console.log(messages)
      const stream = await this.modelWithTools.stream(messages)

      let fullAIMessage: AIMessageChunk | null = null

      // 一次stream里，往往混合 content 和 tool_calls
      for await (const chunk of stream as AsyncIterable<AIMessageChunk>) {
        fullAIMessage = fullAIMessage ? fullAIMessage.concat(chunk) : chunk

        const hasToolCallChunk = !!fullAIMessage.tool_call_chunks && fullAIMessage.tool_call_chunks.length > 0

        // 非function call
        if (!hasToolCallChunk) {
          // console.log(chunk.content)
          yield chunk.content as string
        } else {
          // console.log(chunk.tool_call_chunks)
        }
      }

      if (!fullAIMessage) {
        console.log('[思考结束。]')
        return
      }

      messages.push(fullAIMessage)


      const toolCalls = fullAIMessage.tool_calls || []
      if (!toolCalls.length) {
        console.log('[思考结束。。]')
        return
      }

      for (const toolCall of toolCalls) {
        console.log('[toolCall]' + toolCall.name)
        // console.log(toolCall.args)
        if (toolCall.name === 'query_user') {
          const args = queryUserArgsSchema.parse(toolCall.args)
          const result = await this.queryUserTool.invoke(args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'send_mail') {
          const result = await this.sendMailTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'web_search') {
          const result = await this.webSearchTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'db_users_crud') {
          const result = await this.dbUsersCrudTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'time_now') {
          const result = await this.timeNowTool.invoke(toolCall.args);

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          );
        } else if (toolCall.name === 'cron_job') {
          const result = await this.cronJobTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              name: toolCall.name,
              tool_call_id: toolCall.id as string
            })
          )
        }
      }
    }

    console.log('[思考结束]')
  }
}
