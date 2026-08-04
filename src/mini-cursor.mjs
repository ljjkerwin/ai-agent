import 'dotenv/config'
import getModel from './utils/getModel.mts'
import { SystemMessage, HumanMessage, ToolMessage } from '@langchain/core/messages'
import { tools } from './all-tools.mjs'
import chalk from 'chalk'


const model = getModel()

const modelWithTools = model.bindTools(tools)


/**
 * 
 * @param {*} query 
 * @param {*} maxIterations 迭代次数
 */
async function runAgentWithTools(query, maxIterations = 30) {
    const messages = [
        new SystemMessage(
            `你是一个资深前端开发，擅长前端代码开发，可使用已有的工具进行本地代码的修改。
当前工作目录: ${process.cwd()}
` // 按理来说不用把所有tool都列出来，不用把所有tool的注意规则都写一下，这样就不智能了
        ),
        new HumanMessage(query)
    ]

    for (let i = 0; i < maxIterations; i++) {
        console.log(chalk.bgGreen(`⏳ 正在等待 AI 思考...`))
        console.time('think')
        const aiMessage = await modelWithTools.invoke(messages)
        console.timeEnd('think')
        messages.push(aiMessage)

        // 检查工具调用
        if (aiMessage.tool_calls?.length > 0) {
            // 串行
            for (const toolCall of aiMessage.tool_calls) {
                const tool = tools.find(t => t.name === toolCall.name)
                if (tool) {
                    console.time(toolCall.name)
                    const toolResult = await tool.invoke(toolCall.args)
                    console.timeEnd(toolCall.name)
                    messages.push(
                        new ToolMessage({
                            content: toolResult,
                            tool_call_id: toolCall.id
                        })
                    )
                }
            }
        }

        else {
            console.log(`\nAI 最终回复：\n${aiMessage.content}`)
            return aiMessage.content
        }
    }

    return messages[messages.length - 1].content
}




// echo 在 windows 可能不支持，可以去掉 echo 试试，不一定需要用户选择，或者换成 windows 的命令写法
const case1 = `创建一个功能丰富的 React TodoList 应用：

1. 创建项目：echo -e "n\nn" | pnpm create vite react-todo-app --template react-ts
2. 修改 src/App.tsx，实现完整功能的 TodoList：
 - 添加、删除、编辑、标记完成
 - 分类筛选（全部/进行中/已完成）
 - 统计信息显示
 - localStorage 数据持久化
3. 添加复杂样式：
 - 渐变背景（蓝到紫）
 - 卡片阴影、圆角
 - 悬停效果
4. 添加动画：
 - 添加/删除时的过渡动画
 - 使用 CSS transitions
5. 列出目录确认

注意：使用 pnpm，功能要完整，样式要美观，要有动画效果

之后在 react-todo-app 项目中：
1. 使用 pnpm install 安装依赖
2. 使用 pnpm run dev 启动服务器
`;



runAgentWithTools(case1)