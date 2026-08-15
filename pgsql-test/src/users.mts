import { query } from "./db.mts";

export async function createUser(name: string) {
    const { rows } = await query(
        'INSERT INTO users (name) VALUES ($1) RETURNING *',
        [name]
    )
    return rows[0]
}


export async function getUserById(id: number) {
    const { rows } = await query(
        'SELECT * FROM users WHERE id = $1',
        [id]
    )
    return rows[0] ?? null;
}


export async function getAllUsers() {
    const { rows } = await query(
        "SELECT * FROM users ORDER BY id"
    )
    return rows
}


export async function updateUser(id: number, name: string) {
    const { rows } = await query(
        'UPDATE users SET name = $1 WHERE id = $2 RETURNING *',
        [name, id]
    )
    return rows[0] ?? null;
}

export async function deleteUser(id: number) {
    const { rowCount } = await query(
        'DELETE FROM users WHERE id = $1',
        [id]
    )
    return !!rowCount && rowCount > 0;
}