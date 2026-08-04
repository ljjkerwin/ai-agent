import { getEmbeddings } from "../utils/getModel.mts";
import getMilvusClient from "../utils/getMilvusClient.mts";
import { MetricType } from "@zilliz/milvus2-sdk-node";


const COLLECTION_NAME = 'ai_diary'

const embeddings = getEmbeddings()

const milvusClient = getMilvusClient()

async function getEmbedding(text: string) {
    return await embeddings.embedQuery(text)
}


async function main() {
    try {
        await milvusClient.connectPromise

        const query = '查询学习、做饭的日记'

        const queryVector = await getEmbedding(query)

        const searchResult = await milvusClient.search({
            collection_name: COLLECTION_NAME,
            vector: queryVector,
            limit: 3,
            metric_type: MetricType.COSINE,
            output_fields: [
                'id',
                'content',
                'date',
                'mood',
                'tags'
            ]
        })

        console.log(searchResult)

    } catch (err) {
        console.error(err)
    }
}

main()