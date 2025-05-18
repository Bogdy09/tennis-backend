import { dbPromise, sql } from '../data/db.js';

async function getAllPlayers() {
    try {
        const result = await dbPromise.request().query('SELECT * FROM Players');
        return result.recordset;
    } catch (err) {
        console.error('SQL error', err);
        throw err;
    }
}

// ES Module export
export default {
    getAllPlayers
};

// Alternative named exports:
// export { getAllPlayers };