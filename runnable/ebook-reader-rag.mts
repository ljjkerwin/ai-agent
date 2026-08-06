import getModel, { getEmbeddingModel } from '../utils/getModel.mts'
import getMilvusClient from '../utils/getMilvusClient.mts'
import { RunnableSequence } from '@langchain/core/runnables';
import { MetricType } from '@zilliz/milvus2-sdk-node';
import {
    PromptTemplate,
} from '@langchain/core/prompts';
import { StringOutputParser } from "@langchain/core/output_parsers";

const COLLECTION_NAME = "ebook_collection";

const model = getModel()

const embeddings = getEmbeddingModel()

const milvusClient = getMilvusClient()


// PromptTemplate：负责把 context / question 拼成最终 prompt
const promptTemplate = PromptTemplate.fromTemplate(
    `你是一个专业的《天龙八部》小说助手。基于小说内容回答问题，用准确、详细的语言。

请根据以下《天龙八部》小说片段内容回答问题：
{context}

用户问题: {question}

回答要求：
1. 如果片段中有相关信息，请结合小说内容给出详细、准确的回答
2. 可以综合多个片段的内容，提供完整的答案
3. 如果片段中没有相关信息，请如实告知用户
4. 回答要准确，符合小说的情节和人物设定
5. 可以引用原文内容来支持你的回答

AI 助手的回答:`
);


const ragChain = RunnableSequence.from([
    async (input) => {
        const queryVector = await embeddings.embedQuery(input.question)

        const searchResult = await milvusClient.search({
            collection_name: COLLECTION_NAME,
            vector: queryVector,
            limit: input.k,
            metric_type: MetricType.COSINE,
            output_fields: [
                'id',
                'book_id',
                'chapter_num',
                'index',
                'content'
            ]
        })

        const retrievedContent = searchResult.results || []
        console.log('retrievedContent', retrievedContent)

        return {
            ...input,
            retrievedContent
        }
    },
    async state => {
        const { question, retrievedContent } = state

        if (!retrievedContent.length) {
            return {
                ...state,
                context: '',
                hasContext: false,
                answer: "抱歉，我没有找到相关的《天龙八部》内容。请尝试换一个问题。",
            }
        }

        const context = retrievedContent.map((item, index) => `[片段 ${index + 1}]
章节：第 ${item.chapter_num} 章
内容：${item.content}`).join('\n\n------\n\n')

        return {
            ...state,
            context,
            hasContext: true,
        }
    },
    promptTemplate,
    model,
    new StringOutputParser(), // StringOutputParser 是 LangChain 最常用的输出解析器之一，主要用于剥离 LLM 输出的元数据包（AIMessage），只保留并输出最终的纯文本字符串。
])



/**
加载milvus

input

embedding

retrieve

prompt

model
 */
async function main() {
    const input = {
        question: "鸠摩智会什么武功？",
        k: 5,
    };

    try {
        await milvusClient.connectPromise

        try {
            await milvusClient.loadCollection({ collection_name: COLLECTION_NAME });
            console.log("✓ 集合已加载\n");
        } catch (error) {
            if (!error.message.includes("already loaded")) {
                throw error;
            }
            console.log("✓ 集合已处于加载状态\n");
        }

        const stream = await ragChain.stream(input)

        for await (const chunk of stream) {
            // console.log(chunk)
            process.stdout.write(chunk)
        }

        process.stdout.write("\n");

    } catch (error) {
        console.error(error)
    }
}


main()