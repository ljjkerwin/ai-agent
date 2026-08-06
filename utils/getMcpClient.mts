import 'dotenv/config'
import { MultiServerMCPClient } from "@langchain/mcp-adapters"

export default () => {
    return new MultiServerMCPClient({
        mcpServers: {
            // 'my-mcp-server': {
            //     command: 'node',
            //     args: [
            //         './src/my-mcp-server.mjs'
            //     ]
            // },
            "amap-maps-streamableHTTP": {
                url: 'https://mcp.amap.com/mcp?key=' + process.env.AMAP_MAPS_API_KEY
            },
            "filesystem": {
                "command": "npx",
                "args": [
                    "-y",
                    "@modelcontextprotocol/server-filesystem",
                    ...(process.env.ALLOWED_PATHS!.split(',') || '')
                ]
            },
            "chrome-devtools": {
                "command": "npx",
                "args": [
                    "-y",
                    "chrome-devtools-mcp@latest"
                ]
            }
        }
    })
}