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
  ) {
    this.modelWithTools = model.bindTools([
      queryUserTool,
      sendMailTool,
      webSearchTool,
      dbUsersCrudTool,
    ])
  }


  async runChain(query: string): Promise<string> {
    const messages: BaseMessage[] = [
      new SystemMessage('你是一个智能助手，可以在需要时调用工具(如 query_user)来查询用户信息，再用结果回答用户的问题。'),
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
          console.log(toolCall.args)
          const args = queryUserArgsSchema.parse(toolCall.args)
          const result = await this.queryUserTool.invoke(args)

          messages.push(
            new ToolMessage({
              content: result as string,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'send_mail') {
          const result = await this.sendMailTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'web_search') {
          const result = await this.webSearchTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'db_user_crud') {
          const result = await this.dbUsersCrudTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              tool_call_id: toolCall.id as string
            })
          )
        }
      }
    }
  }

  async *runChainStream(query: string): AsyncIterable<string> {
    const messages: BaseMessage[] = [
      new SystemMessage('你是一个智能助手，可以在需要时调用工具(如 query_user)来查询用户信息，再用结果回答用户的问题。'),
      new HumanMessage(query)
    ]

    console.log('[开始思考]')
    while (true) {
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

      if (!fullAIMessage) return

      messages.push(fullAIMessage)


      const toolCalls = fullAIMessage.tool_calls || []
      if (!toolCalls.length) {
        return
      }

      for (const toolCall of toolCalls) {
        console.log('[toolCall]' + toolCall.name)
        console.log(toolCall.args)
        if (toolCall.name === 'query_user') {
          const args = queryUserArgsSchema.parse(toolCall.args)
          const result = await this.queryUserTool.invoke(args)

          messages.push(
            new ToolMessage({
              content: result as string,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'send_mail') {
          const result = await this.sendMailTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'web_search') {
          const result = await this.webSearchTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              tool_call_id: toolCall.id as string
            })
          )
        } else if (toolCall.name === 'db_users_crud') {
          const result = await this.dbUsersCrudTool.invoke(toolCall.args)

          messages.push(
            new ToolMessage({
              content: result as string,
              tool_call_id: toolCall.id as string
            })
          )
        }
      }
    }
  }
}
