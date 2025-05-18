
import express from 'express';
import { db } from '../data/db.js';

const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const pool = await db.pool;
        const { name, sort } = req.query;

        let query = 'SELECT * FROM Players';
        const conditions = [];

        // Filtering
        if (name) {
            conditions.push(`name LIKE '%${name}%'`);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        // Sorting
        if (sort === 'asc' || sort === 'desc') {
            query += ` ORDER BY ranking ${sort.toUpperCase()}`;
        }

        const result = await pool.request().query(query);

        res.json(result.recordset);
    } catch (err) {
        console.error('Database error:', err);
        res.status(500).json({ error: 'Failed to load players' });
    }
});


// POST create player
router.post('/', async (req, res) => {
    console.log("POST body:", req.body); // DEBUG LOG
    const { name, country, ranking } = req.body;

    if (!name || !country || ranking === undefined) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        const pool = await db.pool;
        await pool.request()
            .input('name', db.sql.NVarChar, name)
            .input('country', db.sql.NVarChar, country)
            .input('ranking', db.sql.Int, ranking)
            .query('INSERT INTO Players (name, country, ranking) VALUES (@name, @country, @ranking)');
        res.status(201).json({ message: 'Player created' });
    } catch (err) {
        console.error('POST error:', err);
        res.status(500).json({ error: 'Failed to create player' });
    }
});


// PUT update player
router.put('/:id', async (req, res) => {
    const { name, country, ranking } = req.body;
    const { id } = req.params;
    try {
        const pool = await db.pool;
        await pool.request()
            .input('id', db.sql.Int, id)
            .input('name', db.sql.NVarChar, name)
            .input('country', db.sql.NVarChar, country)
            .input('ranking', db.sql.Int, ranking)
            .query('UPDATE Players SET name = @name, country = @country, ranking = @ranking WHERE id = @id');
        res.json({ message: 'Player updated' });
    } catch (err) {
        console.error('PUT error:', err);
        res.status(500).json({ error: 'Failed to update player' });
    }
});

// DELETE player
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await db.pool;
        await pool.request()
            .input('id', db.sql.Int, id)
            .query('DELETE FROM Players WHERE id = @id');
        res.json({ message: 'Player deleted' });
    } catch (err) {
        console.error('DELETE error:', err);
        res.status(500).json({ error: 'Failed to delete player' });
    }
});


export default router;