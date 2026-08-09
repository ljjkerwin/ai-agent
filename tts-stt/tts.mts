import 'dotenv/config';
import axios from 'axios';
import fs from 'node:fs/promises';
import path from 'node:path';

const API_KEY = process.env.OPENAI_API_KEY;
const baseUrl = process.env.OPENAI_BASE_URL?.replace(/\/$/, '');
// 小米 MiMo-V2.5-TTS 使用 /chat/completions 端点而非 /audio/speech
const API_URL = `${baseUrl}/chat/completions`;

async function synthesizeSpeech() {
    try {
        const response = await axios.post(
            API_URL,
            {
                model: 'mimo-v2.5-tts',
                messages: [
                    {
                        role: 'user',
                        content: '温柔的女声，语速偏慢，带有刚睡醒的沙哑感' // 风格控制指令
                    },
                    {
                        role: 'assistant',
                        content: '(刚醒来，带着微微的懒音) 早上好呀，今天又是充满希望的一天！' // 要合成的文本
                    }
                ],
                voice: 'default',
                response_format: 'wav'
            },
            {
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    'Content-Type': 'application/json',
                },
                responseType: 'arraybuffer',
            }
        );

        const outputPath = path.join(process.cwd(), 'dist/output.wav');
        await fs.writeFile(outputPath, response.data);
        console.log(`✅ 语音合成成功，已保存至: ${outputPath}`);

    } catch (error: any) {
        if (error.response) {
            const errorMsg = Buffer.isBuffer(error.response.data)
                ? error.response.data.toString()
                : error.response.data;
            console.error('❌ 请求失败:', error.response.status, errorMsg);
        } else {
            console.error('❌ 发生错误:', error.message);
        }
    }
}

synthesizeSpeech();
