
import db from '../data/db.js';

// TournamentController.js
export async function getAllTournaments(req, res) {
    try {
        const result = await db.query('SELECT * FROM Tournaments');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}
export default {
    getAllTournaments
};

