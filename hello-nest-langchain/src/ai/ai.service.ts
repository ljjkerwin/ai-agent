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
import { AIMessageChunk, createAgent, Tool } from 'langchain'
import { UIMessage } from 'ai'
import { toBaseMessages, toUIMessageStream } from '@ai-sdk/langchain'

@Injectable()
export class AiService {
  private readonly chain: Runnable;

  private readonly agent: ReturnType<typeof createAgent>;

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject('CHAT_MODEL') model: ChatOpenAI,
    @Inject('WEB_SEARCH_TOOL') private readonly webSearchTool: Tool,
    @Inject('SEND_MAIL_TOOL') private readonly sendMailTool: any,
  ) {
    const prompt = PromptTemplate.fromTemplate(
      '请回答以下问题：\n\n{query}',
    )

    // const model = new ChatOpenAI({
    //   temperature: 0.7,
    //   modelName: configService.get('OPENAI_MODEL_NAME'),
    //   apiKey: configService.get('OPENAI_API_KEY'),
    //   configuration: {
    //     baseURL: configService.get('OPENAI_BASE_URL')
    //   }
    // })

    this.chain = prompt.pipe(model).pipe(new StringOutputParser());

    this.agent = createAgent({
      model,
      tools: [this.webSearchTool, this.sendMailTool],
      systemPrompt:
        '你是 AI 助手，需要最新信息、事实核查或联网信息时，请使用 web_search 工具搜索后再作答。发送邮件用 send_mail 工具'
    })
  }


  async runChain(query: string): Promise<string> {
    console.log(query)
    return this.chain.invoke({
      query
    })
  }

  async *streamChain(query: string): AsyncGenerator<string> {
    console.log(query)
    const stream = await this.chain.stream({
      query
    })
    for await (const chunk of stream) {
      yield chunk;
    }
  }

  async stream(messages: UIMessage[]) {
    const lcMessages = await toBaseMessages(messages)

    const lgStream = await this.agent.stream({
      messages: lcMessages
    }, {
      streamMode: ['messages', 'values'],
      recursionLimit: 12
    })

    return toUIMessageStream(lgStream)
  }
}
