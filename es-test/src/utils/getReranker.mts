import "dotenv/config";
import { BaseDocumentCompressor } from "@langchain/core/retrievers/document_compressors";

class DashScopeRerank extends BaseDocumentCompressor {

    constructor({
        apiKey = process.env.RERANK_API_KEY,
        model = process.env.RERANK_MODEL_NAME,
        topN = 3,
        baseUrl = process.env.RERANK_BASE_URL,
    } = {}) {
        super();
        this.apiKey = apiKey;
        this.model = model;
        this.topN = topN;
        this.baseUrl = baseUrl?.replace(/\/$/, "");
    }

    async compressDocuments(documents, query, _callbacks) {
        console.log('compressDocuments')
        if (!this.baseUrl) {
            throw new Error("Missing OPENAI_BASE_URL for the rerank API");
        }

        // OPENAI_BASE_URL normally points to an OpenAI-compatible API root
        // (for example, https://api.siliconflow.cn/v1), while reranking is
        // served from its own endpoint.
        const endpoint = this.baseUrl.endsWith("/rerank")
            ? this.baseUrl
            : `${this.baseUrl}/rerank`;

        const res = await fetch(endpoint, {
            method: "POST",
            headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: this.model,
                    query,
                    documents: documents.map((d) => d.pageContent),
                    return_documents: false,
                    top_n: this.topN,
            }),
        });

        const responseText = await res.text();
        // console.log('responseText', responseText)
        let json;
        try {
            json = JSON.parse(responseText);
        } catch {
            const contentType = res.headers.get("content-type") ?? "unknown";
            const preview = responseText.replace(/\s+/g, " ").slice(0, 300);
            throw new Error(
                `DashScope rerank returned non-JSON (${res.status}, ${contentType}) from ${endpoint}: ${preview}`,
            );
        }
        if (!res.ok) {
            throw new Error(
                `DashScope rerank ${res.status}: ${JSON.stringify(json)}`,
            );
        }

        // DashScope returns results at the top level, whereas some compatible
        // rerank APIs wrap them in an `output` object.
        const results = json?.output?.results ?? json?.results;
        if (!Array.isArray(results)) {
            throw new Error(`unexpected rerank response: ${JSON.stringify(json)}`);
        }

        return results.map((item) => {
            if (!Number.isInteger(item?.index) || !documents[item.index]) {
                throw new Error(`unexpected rerank result: ${JSON.stringify(item)}`);
            }
            return documents[item.index];
        });
    }
}


export default function getReranker({
    topN = 3,
}: {
    topN?: number;
} = {}) {
    return new DashScopeRerank({
        topN,
    });
}