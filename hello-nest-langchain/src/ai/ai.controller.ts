import { Controller, Get, Post, Body, Patch, Param, Delete, Query, Sse } from '@nestjs/common';
import { AiService } from './ai.service';
import { CreateAiDto } from './dto/create-ai.dto';
import { UpdateAiDto } from './dto/update-ai.dto';
import { from, map, Observable } from 'rxjs';
import { AiCronService } from './ai.cron.service';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiCronService: AiCronService,
  ) { }

  @Get('chat')
  async chat(@Query('query') query: string) {
    const answer = await this.aiService.runChain(query)
    return { answer }
  }

  @Sse('chat/stream')
  chatStream(@Query('query') query: string): Observable<{ data: string }> {
    return from(this.aiService.streamChain(query)).pipe(
      map(chunk => ({ data: chunk }))
    )
  }

  @Get('cron/chat')
  async cronChat(@Query('query') query: string) {
    const answer = await this.aiCronService.runChain(query)
    return { answer }
  }

  @Sse('cron/chat/stream')
  async cronChatStream(@Query('query') query: string) {
    const stream = this.aiCronService.runChainStream(query)

    return from(stream).pipe(
      map(chunk => ({ data: chunk }))
    )
  }
  // curl -N -G "http://localhost:3000/ai/cron/chat/stream" --data-urlencode "query=用户001的消息"
  // curl -N -G "http://localhost:3000/ai/cron/chat/stream" --data-urlencode "query=用户001的消息，发送到邮箱 ljjnotice@163.com"
  // 搜索今天早上的a股新闻，整理成html，发送到我的邮箱ljjnotice@163.com
}
