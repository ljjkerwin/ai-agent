import 'dotenv/config'
import { Client } from '@elastic/elasticsearch';

export default () => {
    return new Client({
        node: process.env.ELASTICSEARCH_NODE
    });
}