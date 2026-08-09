import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';

@Injectable()
export class LlmService {
    @Inject(ConfigService)
    private readonly configService: ConfigService;

    getModel() {
        return new ChatOpenAI({
            temperature: 0.7,
            modelName: this.configService.get('OPENAI_MODEL_NAME'),
            apiKey: this.configService.get('OPENAI_API_KEY'),
            configuration: {
                baseURL: this.configService.get('OPENAI_BASE_URL')
            },
            modelKwargs: {
                thinking: {
                    type: 'disabled',
                }
            }
        })
    }
}

