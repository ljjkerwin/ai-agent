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

@Injectable()
export class AiService {
  create(createAiDto: CreateAiDto) {
    return 'This action adds a new ai';
  }

  findAll() {
    return `This action returns all ai`;
  }

  findOne(id: number) {
    return `This action returns a #${id} ai`;
  }

  update(id: number, updateAiDto: UpdateAiDto) {
    return `This action updates a #${id} ai`;
  }

  remove(id: number) {
    return `This action removes a #${id} ai`;
  }

  private readonly chain: Runnable;

  constructor(
    @Inject(ConfigService) configService: ConfigService,
    @Inject('CHAT_MODEL') model: ChatOpenAI
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
}
