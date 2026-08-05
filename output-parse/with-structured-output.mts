import z from "zod";
import getModel from "../utils/getModel.mts";

const model = getModel()

const scientistSchema = z.object({
    name: z.string().describe('科学家的名字'),
    birth_year: z.number().describe('出生年份'),
    age: z.number().describe('科学家的年龄'),
    gender: z.string().describe('科学家的性别'),
    field: z.string().describe('科学家的研究领域'),
})


const moduleWithStructure = model.withStructuredOutput(scientistSchema)

console.log(111)

try {
    const response = await moduleWithStructure.invoke("请介绍一下居里夫人.")

    console.log(JSON.stringify(response))
} catch (error) {
    console.error(error)
}

