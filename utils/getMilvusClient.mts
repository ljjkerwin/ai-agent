import 'dotenv/config'
import { MilvusClient } from "@zilliz/milvus2-sdk-node"

export default () => {
    return new MilvusClient({
        address: process.env.MILVUS_ADDRESS as string,
        token: process.env.MILVUS_TOKEN as string
    })
}