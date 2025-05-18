import sql from 'mssql';

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    server: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: process.env.DB_NAME,
    options: {
        trustServerCertificate: true,
        encrypt: false
    }
};

const pool = new sql.ConnectionPool(config);

export const db = {
    pool: pool.connect().then(() => {
        console.log('Connected to SQL Server via ngrok');
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
