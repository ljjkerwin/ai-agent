import { MetricType } from "@zilliz/milvus2-sdk-node";
import getMilvusClient from "../utils/getMilvusClient.mts";
import getModel, { getEmbeddingModel } from "../utils/getModel.mts";

const COLLECTION_NAME = 'ai_diary'

const model = getModel({
    temperature: 0.7
})

const embeddings = getEmbeddingModel()

const milvusClient = getMilvusClient()

async function getEmbedding(text: string) {
    return embeddings.embedQuery(text)
}

async function retrieveRelevantDiaries(question: string, k = 2) {
    try {
        const queryVector = await getEmbedding(question)

        const searchResult = await milvusClient.search({
            collection_name: COLLECTION_NAME,
            vector: queryVector,
            limit: k,
            metric_type: MetricType.COSINE,
            output_fields: [
                'id',
                'content',
                'date',
                'mood',
                'tags'
            ]
        })

        return searchResult.results
    } catch (err) {
        console.error(err)
        return []
    }
}


async function answerDiaryQuestion(question: string, k = 3) {
    try {
        const retrievedDiaries = await retrieveRelevantDiaries(question, k)


        if (retrievedDiaries.length === 0) {
            return '抱歉没找到相关日记'
        }

        console.log(retrievedDiaries)

        const context = retrievedDiaries.map((diary, index) => `日记 ${index}
日期：${diary.date}
心情：${diary.mood}
标签：${diary.tags?.join?.(',')}
内容：${diary.content}`).join('\n\n------\n\n')


        const prompt = `你是一个日记助手。基于用户的日记内容回答问题
日记内容：
${context}

用户问题：
${question}

日记助手回答：`

        const response = await model.invoke(prompt)


        return response.content
    } catch (err) {
        console.error(err)
        return ''
    }
}


await milvusClient.connectPromise

console.log(await answerDiaryQuestion('我最近做了什么开心的事'))