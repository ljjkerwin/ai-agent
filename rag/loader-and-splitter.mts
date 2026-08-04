import { RecursiveCharacterTextSplitter } from "@langchain/classic/text_splitter";
import { CheerioWebBaseLoader } from "@langchain/community/document_loaders/web/cheerio";

const cheerioLoader = new CheerioWebBaseLoader(
    'https://juejin.cn/post/7233327509919547452',
    {
        selector: '.main-area p'
    }
)



const documents = await cheerioLoader.load()

const textSplitter = new RecursiveCharacterTextSplitter({
    chunkSize: 400,
    chunkOverlap: 50,
    separators: ['。', '！', '？'],

})

const splitDocuments = await textSplitter.splitDocuments(documents)


console.log(splitDocuments)