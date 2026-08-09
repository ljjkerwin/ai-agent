import { Injectable } from '@nestjs/common';
import { tool } from '@langchain/core/tools';

@Injectable()
export class TimeNowToolService {
    readonly tool;

    constructor() {
        this.tool = tool(
            async () => {
                const now = new Date();
                const result = {
                    iso: now.toISOString(),
                    timestamp: now.getTime(),
                }
                return result.iso
                // return result
            },
            {
                name: 'time_now',
                // description: '获取当前服务器时间，返回 ISO 字符串（iso）和毫秒级时间戳（timestamp）。',
                description: '获取当前服务器时间，返回 ISO 字符串',
            },
        );
    }
}

