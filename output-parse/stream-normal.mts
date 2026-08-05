import z from "zod";
import getModel from "../utils/getModel.mts";

const model = getModel()

const prompt = `请介绍一下居里夫人.`

try {
    const stream = await model.stream(prompt)

    console.log(stream)

    let fullContent = ''
    let chunkCount = 0

    for await (const chunk of stream) {
        // console.log('chunk', chunk)
        chunkCount++
        const content = chunk.content
        fullContent += content

        // process.stdout.write(content as string)
        console.log(content)
    }

    console.log('\nchunkCount:', chunkCount)
    // console.log('fullContent:', fullContent)

} catch (err) {
    console.error(err)
}