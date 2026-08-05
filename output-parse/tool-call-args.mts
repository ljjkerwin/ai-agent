import z from "zod";
import getModel from "../utils/getModel.mts";

const model = getModel()

const scientistSchema = z.object({
    name: z.string().describe('科学家的名字'),
    birth_year: z.number().describe('出生年份'),
    age: z.number().describe('科学家的年龄'),
    gender: z.string().describe('科学家的性别'),
    field: z.string().describe('科学家的研究领域'),
    contributions: z.array(z.string()).describe('科学家的研究贡献'),
})


const modelWithTools = model.bindTools([
    {
        name: 'extract_scientist_info',
        description: '提取和结构化化科学家的详细信息',
        schema: scientistSchema
    }
])



const response = await modelWithTools.invoke("请介绍一下居里夫人.")

console.log(JSON.stringify(response.tool_calls))