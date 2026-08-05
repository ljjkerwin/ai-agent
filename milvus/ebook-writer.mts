import "dotenv/config";
import { parse } from 'path';
import { getEmbeddingModel } from "../utils/getModel.mts";
import getMilvusClient from "../utils/getMilvusClient.mts";

const COLLECTION_NAME = 'ebook_collection';
const VECTOR_DIM = 1024;
const CHUNK_SIZE = 500; // 拆分到 500 个字符
const EPUB_FILE = './天龙八部.epub';


// 从文件名提取书名（去掉扩展名）
const BOOK_NAME = parse(EPUB_FILE).name;


const embeddings = getEmbeddingModel({
    dimensions: VECTOR_DIM
})


const milvusClient = getMilvusClient()


async function getEmbedding(text: string) {
    const result = await embeddings.embedQuery(text);
    return result;
}
