import 'dotenv/config'
import mysql from 'mysql2/promise'
import getMysqlConnection from '../utils/getMysqlConnection.mts'

async function main() {
    const connection = await getMysqlConnection()


    try {
        await connection.query(`CREATE DATABASE IF NOT EXISTS hello CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`)
        await connection.query(`USE hello`)

        await connection.query(`
            CREATE TABLE IF NOT EXISTS friends (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(50) NOT NULL,
                gender VARCHAR(10),                 -- 性别
                birth_date DATE,                    -- 出生日期
                company VARCHAR(100),               -- 公司
                title VARCHAR(100),                 -- 职位
                phone VARCHAR(20),                  -- 手机
                wechat VARCHAR(50)                 -- WeChat
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        `)


        const insertSql = `
            INSERT INTO friends (
                name,
                gender,
                birth_date,
                company,
                title,
                phone,
                wechat
            ) VALUES (?,?,?,?,?,?,?);
        `

        const values = [
            "王经理", // name
            "男", // gender
            "1990-01-01", // birth_date
            "字节跳动", // company
            "产品经理/产品总监", // title
            "18612345678", // phone
            "wangjingli2024", // wechat
        ];

        const [result] = await connection.execute(insertSql, values)

        console.log('执行结果：', result)

    } catch (error) {
        console.error(error)
    } finally {
        await connection.end()
    }
}



main()