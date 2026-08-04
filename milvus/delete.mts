import { DataType, IndexType, MetricType, MilvusClient } from "@zilliz/milvus2-sdk-node"

import getMilvusClient from '../utils/getMilvusClient.mts'
import { getEmbeddings } from "../utils/getModel.mts"

const COLLECTION_NAME = 'ai_diary'

const VECTOR_DIM = 1024 // Embedding 输出向量的维度

const milvusClient = getMilvusClient()


async function main() {
    try {
        console.log('Connecting to Milvus...')
        await milvusClient.connectPromise
        console.log('Connected to Milvus.')


        console.log('delete one')

        const updateId = 'diary_005'

        const result = await milvusClient.delete({
            collection_name: COLLECTION_NAME,
            filter: `id == "${updateId}"`
        })

        console.log(result)



        console.log('batch delete')
        const ids = ['diary_003', 'diary_004'].map(item => JSON.stringify(item)).join(',')

        const batchResult = await milvusClient.delete({
            collection_name: COLLECTION_NAME,
            filter: `id in [${ids}]`
        })

        console.log(batchResult)


        console.log('delete by condition')

        const conditionResult = await milvusClient.delete({
            collection_name: COLLECTION_NAME,
            filter: `mood == "excited"`
        })

        console.log(conditionResult)

    } catch (err) {
        console.error(err)
    }
}



main()