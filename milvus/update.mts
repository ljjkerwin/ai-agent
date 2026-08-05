import { DataType, IndexType, MetricType, MilvusClient } from "@zilliz/milvus2-sdk-node"

import getMilvusClient from '../utils/getMilvusClient.mts'
import { getEmbeddingModel } from "../utils/getModel.mts"

const COLLECTION_NAME = 'ai_diary'

const VECTOR_DIM = 1024 // Embedding 输出向量的维度

const embeddings = getEmbeddingModel({
    dimensions: 1024
})



const milvusClient = getMilvusClient()


async function getEmbedding(text: string) {
    return await embeddings.embedQuery(text)
}

async function main() {
    try {
        console.log('Connecting to Milvus...')
        await milvusClient.connectPromise
        console.log('Connected to Milvus.')


        const updateId = 'diary_007'
        const updatedContent = {
            id: updateId,
            content: '今晚做了顿丰盛的晚餐，全家都很喜欢，我很有成就感。开心...',
            date: '2026-01-13',
            mood: 'happy',
            tags: ['美食', '家庭', '烹饪']
        }


        const vector = await getEmbedding(updatedContent.content)
        const updateData = {
            ...updatedContent,
            vector: vector
        }

        const result = await milvusClient.upsert({
            collection_name: COLLECTION_NAME,
            data: [updateData]
        })


        console.log(result)

    } catch (err) {
        console.error(err)
    }
}



main()