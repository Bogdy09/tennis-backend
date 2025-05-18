import express from 'express';
import { db } from '../data/db.js';
import { logAction } from '../utils/logger.js';

const router = express.Router();

// GET all tournaments
router.get('/', async (req, res) => {
    try {
        const pool = await db.pool;
        const result = await pool.request().query(`
            SELECT 
                T.id, T.name, T.date, T.prizeMoney, 
                P.name AS favoritePlayerName 
            FROM Tournaments T 
            LEFT JOIN Players P ON T.favoritePlayerId = P.id
        `);
        res.json({ tournaments: result.recordset, total: result.recordset.length });
    } catch (err) {
        console.error('Error fetching tournaments', err);
        res.status(500).json({ error: 'Failed to load tournaments' });
    }
});

// GET tournament by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await db.pool;
        const result = await pool.request()
            .input('id', db.sql.Int, id)
            .query(`
                SELECT 
                    T.id, T.name, T.date, T.prizeMoney, 
                    P.name AS favoritePlayerName 
                FROM Tournaments T 
                LEFT JOIN Players P ON T.favoritePlayerId = P.id
                WHERE T.id = @id
            `);

        if (result.recordset.length === 0) return res.status(404).json({ error: 'Not found' });
        res.json(result.recordset[0]);
    } catch (err) {
        res.status(500).json({ error: 'Failed to fetch tournament' });
    }
});

// POST new tournament
router.post('/', async (req, res) => {

    const { name, date, prizeMoney, favoritePlayerId, userId } = req.body;
    if (!name || !date) {
        return res.status(400).json({ error: 'Name and date are required' });
    }

    try {
        const pool = await db.pool;

        // If favoritePlayerId is provided, verify that it exists
        if (favoritePlayerId) {
            const playerCheck = await pool.request()
                .input('id', db.sql.Int, favoritePlayerId)
                .query('SELECT id FROM Players WHERE id = @id');

            if (playerCheck.recordset.length === 0) {
                return res.status(400).json({ error: 'Favorite player does not exist' });
            }
        }

        const result = await pool.request()
            .input('name', db.sql.VarChar(100), name)
            .input('date', db.sql.Date, date)
            .input('prizeMoney', db.sql.VarChar(50), prizeMoney || 'TBD')
            .input('favoritePlayerId', db.sql.Int, favoritePlayerId || null)
            .query(`
                INSERT INTO Tournaments (name, date, prizeMoney, favoritePlayerId)
                OUTPUT INSERTED.*
                VALUES (@name, @date, @prizeMoney, @favoritePlayerId)
            `);
        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }
        await pool.request()
            .input('userId', db.sql.Int, userId)
            .input('action', db.sql.VarChar, 'CREATE_TOURNAMENT')
            .input('timestamp', db.sql.DateTime, new Date())
            .query('INSERT INTO Logs (userId, action, timestamp) VALUES (@userId, @action, @timestamp)');
        res.status(201).json(result.recordset[0]);
    } catch (err) {
        console.error('Insert failed:', err);
        res.status(500).json({ error: 'Failed to create tournament' });
    }
});


// PATCH tournament
router.patch('/:id', async (req, res) => {
    const { id } = req.params;
    const { name, date, prizeMoney, favoritePlayerId, userId } = req.body;

    try {
        const pool = await db.pool;
        await pool.request()
            .input('id', db.sql.Int, id)
            .input('name', db.sql.VarChar(100), name)
            .input('date', db.sql.Date, date)
            .input('prizeMoney', db.sql.Float, prizeMoney)
            .input('favoritePlayerId', db.sql.Int, favoritePlayerId)
            .query(`
                UPDATE Tournaments
                SET 
                    name = ISNULL(@name, name),
                    date = ISNULL(@date, date),
                    prizeMoney = ISNULL(@prizeMoney, prizeMoney),
                    favoritePlayerId = ISNULL(@favoritePlayerId, favoritePlayerId)
                WHERE id = @id
            `);
        await pool.request()
            .input('userId', db.sql.Int, userId)
            .input('action', db.sql.VarChar, 'UPDATE_TOURNAMENT')
            .input('timestamp', db.sql.DateTime, new Date())
            .query('INSERT INTO Logs (userId, action, timestamp) VALUES (@userId, @action, @timestamp)');
        res.json({ success: true });
    } catch (err) {
        console.error('Update failed:', err);
        res.status(500).json({ error: 'Failed to update tournament' });
    }
});

// DELETE tournament
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { userId } = req.body;
    if (!userId) {
        return res.status(400).json({ error: "userId is required" });
    }

    try {
        const pool = await db.pool;
        await pool.request().input('id', db.sql.Int, id).query(`DELETE FROM Tournaments WHERE id = @id`);
        await pool.request()
            .input('userId', db.sql.Int, userId)
            .input('action', db.sql.VarChar, 'DELETE_TOURNAMENT')
            .input('timestamp', db.sql.DateTime, new Date())
            .query('INSERT INTO Logs (userId, action, timestamp) VALUES (@userId, @action, @timestamp)');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete tournament' });
    }
});

export default router;
