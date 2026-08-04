import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";
import initModel, { initEmbeddings } from "../initModel.mjs";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";



const model = initModel()

const embeddings = initEmbeddings()



const cheerioLoader = new CheerioWebBaseLoader(
    'https://juejin.cn/post/7233327509919547452',
    {
        selector: '.main-area p'
    }
)



const documents = await cheerioLoader.load()

console.log(`total characters: ${documents[0].pageContent.length}`)


const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400,
    chunkOverlap: 50,
    separators: ['。', '！', '？'],

})

const splitDocuments = await textSplitter.splitDocuments(documents)

console.log(`文档分割完成，共 ${splitDocuments.length} 个分块`)

const vectorStore = await MemoryVectorStore.fromDocuments(
    splitDocuments,
    embeddings
)

console.log('向量数据库构建完成')


const retriever = vectorStore.asRetriever({ k: 3 })

const questions = [
    '父亲的去世对作者的人生态度产生了怎样的根本性逆转'
]


for (const question of questions) {
    console.log(`question: ${question}`)

    const scoredResults = await vectorStore.similaritySearchWithScore(question, 3)

    scoredResults.forEach(([document, score], index) => {
        console.log(`【文档${index + 1}】 相似度: ${score}`)
        console.log(document.pageContent)
        console.log(`元数据:\n${JSON.stringify(document.metadata, null, 2)}`)
    })

    const context = scoredResults.map(([document, score], index) => {
        return `【文档${index + 1}】\n${document.pageContent}`
    }).join('\n\n------\n\n')

    const prompt = `你是一个文章阅读助手，根据文章内容回答问题：

    文章内容：
    ${context}

    问题：
    ${question}

    你的回答：
    `



    console.log(`\nAI response`)

    console.log((await model.invoke(prompt)).content)
}


