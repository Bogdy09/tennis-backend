// logger.js
import { db } from '../data/db.js';
import sql from 'mssql';

export async function logAction(userId, action) {
    const pool = await db.pool;
    await pool.request()
        .input('userId', sql.Int, userId)
        .input('action', sql.NVarChar, action)
        .query('INSERT INTO ActionLogs (userId, action) VALUES (@userId, @action)');
}
