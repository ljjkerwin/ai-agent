import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import getModel from '../utils/getModel.mts';


const model = getModel()


const response = await model.invoke('介绍一下自己')

console.log(response)