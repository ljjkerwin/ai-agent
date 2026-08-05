import 'dotenv/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';




export default ({
    temperature = 0
} = {}) => {
    return new ChatOpenAI({
        modelName: process.env.OPENAI_MODEL_NAME,
        apiKey: process.env.OPENAI_API_KEY,
        temperature,
        configuration: {
            baseURL: process.env.OPENAI_BASE_URL,
        }
    })
}



export const getEmbeddingModel = ({
    dimensions = 1024
} = {}) => {
    return new OpenAIEmbeddings({
        apiKey: process.env.EMBEDDING_API_KEY,
        model: process.env.EMBEDDING_MODEL,
        configuration: {
            baseURL: process.env.EMBEDDING_BASE_URL
        },
        dimensions,
    })
}