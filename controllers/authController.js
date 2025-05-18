// controllers/authController.js
/*import { db } from '../data/db.js';
import sql from 'mssql';

export async function register(req, res) {
    const { username, password } = req.body;
    const pool = await db.pool;

    try {
        await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query('INSERT INTO Users (username, password) VALUES (@username, @password)');

        res.status(201).json({ message: 'User registered' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

export async function login(req, res) {
    const { username, password } = req.body;
    const pool = await db.pool;

    try {
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query('SELECT * FROM Users WHERE username = @username AND password = @password');

        if (result.recordset.length === 0) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = result.recordset[0];
        res.json({ message: 'Login successful', userId: user.id });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
*/