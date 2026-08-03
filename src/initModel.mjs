import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';




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