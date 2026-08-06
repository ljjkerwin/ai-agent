import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import getMcpClient from "../utils/getMcpClient.mts";
import getModel from "../utils/getModel.mts";
import { HumanMessage, SystemMessage, ToolMessage } from "@langchain/core/messages";
import { Runnable, RunnableBranch, RunnableLambda, RunnablePassthrough, RunnableSequence } from "@langchain/core/runnables";
import chalk from 'chalk'

const model = getModel()

const mcpClient = getMcpClient()

const tools = await mcpClient.getTools()

const modelWithTools = model.bindTools(tools)

const prompt = ChatPromptTemplate.fromMessages([
    new SystemMessage('你是一个可以调用MCP工具的智能助手'),
    new MessagesPlaceholder('messages')
])


const llmChain = prompt
    .pipe(modelWithTools)



/**
大致流程：
input

for maxInterations

modelWithTools

if !toolCalls
    return

else
    handleToolCalls

return
 */

const agentStepChain = RunnableSequence.from([
    RunnablePassthrough.assign({
        response: llmChain
    }),
    RunnableBranch.from([
        [
            state => {
                return !state.response.tool_calls || state.response.tool_calls.length == 0
            },
            RunnableLambda.from(state => {
                return {
                    ...state,
                    messages: state.messages.concat(state.response),
                    done: true,
                    final: state.response.content,
                }
            })
        ],
        RunnableSequence.from([
            // log
            RunnableLambda.from(async state => {
                const { response } = state
                console.log(chalk.bgBlue(`🔍 检测到 ${response.tool_calls.length} 个工具调用`))

                console.log(chalk.bgBlue(response.tool_calls.map((t: any) => t.name).join(',')))
                return state
            }),
            // addHistory
            RunnableLambda.from(state => {
                return {
                    ...state,
                    messages: state.messages.concat(state.response)
                }
            }),
            // tools
            RunnableLambda.from(async state => {
                const { response, tools } = state

                const toolResults = []

                for (const toolCall of response.tool_calls) {
                    const foundTool = tools.find(t => t.name === toolCall.name)
                    if (!foundTool) continue

                    const toolResult = await foundTool.invoke(toolCall.args)

                    // 兼容不同返回格式的字符串化
                    const contentStr = typeof toolResult === 'string' ? toolResult : (toolResult?.text || JSON.stringify(toolResult));

                    toolResults.push(new ToolMessage({
                        content: contentStr,
                        tool_call_id: toolCall.id,
                    }))
                }

                return {
                    ...state,
                    messages: state.messages.concat(toolResults),
                    done: false
                }
            })
        ])
    ])
])



async function runAgentWithTools(query: string, maxIterations = 30) {
    let state = {
        messages: [
            new HumanMessage(query)
        ],
        tools,
        done: false,
        final: undefined,
    }

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`));

        state = await agentStepChain.invoke(state);

        if (state.done) {
            console.log(`\n✨ AI 最终回复:\n${state.final}\n`)
            return state.final
        }
    }

    return state.messages[state.messages.length - 1].content
}

await runAgentWithTools("北京南站附近的酒店，最近的 3 个酒店，拿到酒店图片，打开浏览器，展示每个酒店的图片，每个 tab 一个 url 展示，并且在把那个页面标题改为酒店名");

await mcpClient.close();