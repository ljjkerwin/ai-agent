import 'dotenv/config'
import mysql from 'mysql2/promise'



export default async () => {
    const connectionConfig = {
        host: process.env.MYSQL_HOST,
        user: process.env.MYSQL_USERNAME,
        password: process.env.MYSQL_PASSWORD,
        multipleStatements: true,
    }
    return await mysql.createConnection(connectionConfig)
}