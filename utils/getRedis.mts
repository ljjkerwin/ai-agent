import "dotenv/config";
import Redis from "ioredis";

    
export default () => new Redis({ host: process.env.REDIS_HOST, port: process.env.REDIS_PORT, db: process.env.REDIS_DB, password: process.env.REDIS_PASSWORD });
