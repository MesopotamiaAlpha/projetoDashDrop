require('dotenv').config();
const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'dropvideo.ddns.net',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'produtora_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('Successfully connected to the database.');
        connection.release();
    } catch (error) {
        console.error('Error connecting to the database:', error);
        // Exit process if DB connection fails, as the app cannot run without it.
        // In a real production app, you might want more sophisticated error handling/retry mechanisms.
        process.exit(1);
    }
}

// Test the connection when the module is loaded
// testConnection(); // We will call this in the main server file

module.exports = {
    pool,
    testConnection
};
