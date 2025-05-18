
// src/data/db.js
import sql from 'mssql';

const config = {
    user: 'bogdy12',
    password: 'bogdy12',
    server: 'BOGDY',
    database: 'MPP',
    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

// Create a single connection pool
const pool = new sql.ConnectionPool(config);

// Connect immediately and export the connected pool
export const db = {
    pool: pool.connect().then(() => {
        console.log('Connected to SQL Server');
        return pool;
    }).catch(err => {
        console.error('Database Connection Failed', err);
        throw err;
    }),
    sql
};
export default {
    db
}