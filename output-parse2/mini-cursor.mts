import 'dotenv/config'
import getModel from '../utils/getModel.mts'
import { SystemMessage, HumanMessage, ToolMessage, AIMessage, AIMessageChunk } from '@langchain/core/messages'
import { tools } from '../src/all-tools.mjs'
import chalk from 'chalk'
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history'
import { JsonOutputToolsParser } from '@langchain/core/output_parsers/openai_tools'


const model = getModel()

const modelWithTools = model.bindTools(tools)


/**
 * 
 * @param {*} query 
 * @param {*} maxIterations 迭代次数
 */
async function runAgentWithTools(query: string, maxIterations = 30) {
    const history = new InMemoryChatMessageHistory()

    await history.addMessage(
        new SystemMessage(
            `你是一个资深前端开发，擅长前端代码开发，可使用已有的工具进行本地代码的修改。
当前工作目录: ${process.cwd()}
` // 按理来说不用把所有tool都列出来，不用把所有tool的注意规则都写一下，这样就不智能了
        )
    )

    await history.addMessage(
        new HumanMessage(query)
    )

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`))

        const messages = await history.getMessages()

        const rawStream = await modelWithTools.stream(messages)

        let fullAIMessage

        const toolParser = new JsonOutputToolsParser()

        // 记录每个工具调用已打印的长度（用 id 或 filePath 作为 key）
        const printedLengths = new Map()

        for await (const chunk of rawStream) {
            // console.log('------')
            fullAIMessage = fullAIMessage ? fullAIMessage.concat(chunk) : chunk

            let parsedTools
            try {
                parsedTools = await toolParser.parseResult([{ message: fullAIMessage }])
            } catch (error) {
                // 解析失败说明 JSON 还不完整，忽略错误继续累积
            }


            if (parsedTools && parsedTools.length > 0) {
                // console.log('parsedTools', parsedTools)

                for (const toolCall of parsedTools) {
                    if (toolCall.type === 'write_file' && toolCall.args?.content) {
                        const toolCallId = toolCall.id || toolCall.args.filePath || 'default';
                        const currentContent = String(toolCall.args.content);
                        let previousLength = printedLengths.get(toolCallId) || 0;

                        if (previousLength === undefined) {
                            printedLengths.set(toolCallId, 0);
                            previousLength = 0
                            console.log(
                                chalk.bgBlue(
                                    `\n[工具调用] write_file("${toolCall.args.filePath}") - 开始写入（流式预览）\n`,
                                ),
                            );
                        }
                        // console.log('---', currentContent, currentContent.length > previousLength)
                        if (currentContent.length > previousLength) {
                            const newContent = currentContent.slice(previousLength);
                            process.stdout.write(newContent);
                            printedLengths.set(toolCallId, currentContent.length);
                        }
                    }
                }
            } else {
                // 当前还没有解析出工具调用时，如果有文本内容就直接输出
                if (chunk.content) {
                    process.stdout.write(
                        typeof chunk.content === 'string'
                            ? chunk.content
                            : JSON.stringify(chunk.content),
                    );
                }
            }
        }


        await history.addMessage(fullAIMessage)
        console.log(chalk.green('\n✅ 消息已完整存入历史'));



        // 检查是否有工具调用
        if (!fullAIMessage.tool_calls || fullAIMessage.tool_calls.length === 0) {
            console.log(`\n✨ AI 最终回复:\n${fullAIMessage.content}\n`);
            return fullAIMessage.content;
        }



        // 检查工具调用
        // 串行
        for (const toolCall of fullAIMessage.tool_calls) {
            const foundTool = tools.find(t => t.name === toolCall.name)
            if (foundTool) {
                const toolResult = await foundTool.invoke(toolCall.args)
                await history.addMessage(
                    new ToolMessage({
                        content: toolResult,
                        tool_call_id: toolCall.id
                    })
                )
            }
        }

    }

    const finalMessages = await history.getMessages()

    return finalMessages[finalMessages.length - 1].content
}




// echo 在 windows 可能不支持，可以去掉 echo 试试，不一定需要用户选择，或者换成 windows 的命令写法
const case1 = `创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
 - 添加、删除、编辑、标记完成
 - 分类筛选（全部/进行中/已完成）
 - 统计信息显示
 - localStorage 数据持久化
3. 列出目录确认

注意：使用 pnpm，功能要完整，样式要美观，要有动画效果

之后在 react-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器
`;


try {
    await runAgentWithTools(case1);
} catch (error) {
    console.error(`\n❌ 错误: ${error}\n`);
}
