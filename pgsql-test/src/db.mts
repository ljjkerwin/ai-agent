import 'dotenv/config'
import pg from 'pg'

const { Pool } = pg

const pool = new Pool({
    connectionString: process.env.POSTGRESQL_URL,
})


async function query(text: string, params?: any[]) {
    return pool.query(text, params)
}


export { pool, query}