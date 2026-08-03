import 'dotenv/config'
import { MultiServerMCPClient } from '@langchain/mcp-adapters'
import chalk from 'chalk'
import initModel from './initModel.mjs'
import { HumanMessage, ToolMessage } from '@langchain/core/messages'


const model = initModel()

const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        'my-mcp-server': {
            command: 'node',
            args: [
                '/Users/kerwin/projects/ai-agent/src/my-mcp-server.mjs'
            ]
        }
    },
    onToolsListChanged: async () => {
        tools = await mcpClient.getTools();

        modelWithTools = model.bindTools(tools);
    }
})

let tools = await mcpClient.getTools()
let modelWithTools = model.bindTools(tools)


async function runAgentWithTools(query, maxIterations = 30) {
    const messages = [
        new HumanMessage(query)
    ]

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen('正在思考。。。'))
        const aiMessage = await modelWithTools.invoke(messages)
        messages.push(aiMessage)

        // console.log(aiMessage)

        if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
            console.log('AI 最终回复：\n', aiMessage.content)
            return aiMessage.content
        }

        for (const toolCall of aiMessage.tool_calls) {
            const tool = tools.find(t => t.name === toolCall.name)

            if (tool) {
                const toolResult = await tool.invoke(toolCall.args)
                messages.push(
                    new ToolMessage({
                        content: toolResult,
                        tool_call_id: toolCall.id
                    })
                )
            }
        }
    }

    return messages[messages.length - 1].content
}



await runAgentWithTools('查一下用户002的信息')
// await runAgentWithTools('查一下用户009的信息')
// await runAgentWithTools('MCP server 的使用指南是什么')


// console.log(await mcpClient.listResources())




// 这里需要把服务关掉，不然它不会停止。
mcpClient.close()