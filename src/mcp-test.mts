import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import getModel from "../utils/getModel.mts";
import { BaseMessage, HumanMessage, ToolMessage } from "@langchain/core/messages";
import chalk from "chalk";

const model = getModel()

const mcpClient = new MultiServerMCPClient({
    mcpServers: {
        'my-mcp-server': {
            command: 'node',
            args: [
                './src/my-mcp-server.mjs'
            ]
        },
        "amap-maps-streamableHTTP": {
            url: 'https://mcp.amap.com/mcp?key=' + process.env.AMAP_MAPS_API_KEY
        },
        "filesystem": {
            "command": "npx",
            "args": [
                "-y",
                "@modelcontextprotocol/server-filesystem",
                ...(process.env.ALLOWED_PATHS!.split(',') || '')
            ]
        },
        "chrome-devtools": {
            "command": "npx",
            "args": [
                "-y",
                "chrome-devtools-mcp@latest"
            ]
        }
    }
})

const tools = await mcpClient.getTools()


const modelWithTools = model.bindTools(tools)

async function runAgentWithTools(query: string, maxIterations = 30) {
    const messages: BaseMessage[] = [
        new HumanMessage(query)
    ]

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen('正在思考。。。'))
        const aiMessage = await modelWithTools.invoke(messages)
        messages.push(aiMessage)

        if (!aiMessage.tool_calls || aiMessage.tool_calls.length === 0) {
            console.log('AI 最终回复：\n', aiMessage.content)
            return aiMessage.content
        }

        console.log(chalk.bgBlue(`监测到 ${aiMessage.tool_calls.length} 个工具调用`))

        for (const toolCall of aiMessage.tool_calls) {
            const tool = tools.find(t => t.name === toolCall.name)

            if (tool) {
                console.log(chalk.bgBlue(`调用工具 ${tool.name}，参数：${JSON.stringify(toolCall.args)}`))
                const toolResult = await tool.invoke(toolCall.args)

                let toolResultStr = ""
                if (typeof toolResult === 'string') {
                    toolResultStr = toolResult
                } else if (toolResult && toolResult.text) {
                    toolResultStr = toolResult.text
                }

                messages.push(
                    new ToolMessage({
                        content: toolResultStr,
                        tool_call_id: toolCall.id as string
                    })
                )
            }
        }
    }

    return messages[messages.length - 1].content
}


// await runAgentWithTools('天河客运站去广州东站怎么走？把路线规划生成文档保存下来')
await runAgentWithTools('搜索广州东站最近的3个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个tab一个url展示，并且每个页面标题改为对应酒店名')

// await mcpClient.close()