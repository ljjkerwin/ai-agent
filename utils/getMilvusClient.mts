import 'dotenv/config'
import { MilvusClient } from "@zilliz/milvus2-sdk-node"
import { Milvus } from '@langchain/community/vectorstores/milvus'
import { getEmbeddingModel } from './getModel.mts'

export default () => {
    return new MilvusClient({
        address: process.env.MILVUS_ADDRESS as string,
        token: process.env.MILVUS_TOKEN as string
    })
}



export const getMilvusFromExistingCollection = async ({
    collectionName,
    textField,
    vectorField,
}: {
    collectionName: string
    textField?: string
    vectorField?: string
}) => {
    return await Milvus.fromExistingCollection(getEmbeddingModel(), {
        url: process.env.MILVUS_ADDRESS,
        username: process.env.MILVUS_USERNAME,
        password: process.env.MILVUS_PASSWORD,
        collectionName,
        textField,
        vectorField,
    });
}