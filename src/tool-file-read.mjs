import getModel from './utils/getModel.mts'
import { tool } from '@langchain/core/tools'
import { HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages'
import fs from 'node:fs/promises'
import { z } from 'zod'


const model = getModel()

const readFileTool = tool(
    async ({ read_file }) => {
        const content = await fs.readFile(read_file, 'utf-8')
        console.log(`[工具调用] read_file("${read_file}") - 成功读取 ${content.length} 字节`)
        return `文件内容:/n${content}`
    },
    {
        name: 'read_file',
        description: '用此工具来读取文件内容。当用户要求读取文件、查看代码、分析文件内容时，调用此工具。输入文件路径（可以是相对路径或绝对路径）。',
        schema: z.object({
            read_file: z.string().describe('要读取的文件路径'),
        }),
    }
)


const tools = [
    readFileTool
]


const modelWithTools = model.bindTools(tools)


const messages = [
    new SystemMessage(`你是一个代码助手，可以使用工具读取文件并解析代码`),
    new HumanMessage(`解读一下src/tool-file-read.mjs的代码`)
]



console.log('---- 第1次调用AI')
let aiMessage = await modelWithTools.invoke(messages)

console.log(aiMessage)
messages.push(aiMessage)


while (aiMessage.tool_calls?.length > 0) {
    console.log(`监测到${aiMessage.tool_calls.length}个工具调用`)

    const toolResults = await Promise.all(
        aiMessage.tool_calls.map(async toolCall => {
            const tool = tools.find(t => t.name === toolCall.name)
            if (!tool) return `调用错误：找不到工具${toolCall.name}`

            console.log(`[run tool][${toolCall.name}] ${JSON.stringify(toolCall.args)}`)

            try {
                return await tool.invoke(toolCall.args)
            } catch (err) {
                return `调用错误：${err.message}`
            }
        })
    )

    aiMessage.tool_calls.forEach((toolCall, index) => {
        messages.push(
            new ToolMessage({
                content: toolResults[index],
                tool_call_id: toolCall.id,
            })
        )
    })


    console.log('---- 根据tool_call再次调用AI')
    // 再赋一次值
    aiMessage = await modelWithTools.invoke(messages)
    console.log(aiMessage)
    messages.push(aiMessage)
}


console.log('---- final response')
console.log(aiMessage.content)