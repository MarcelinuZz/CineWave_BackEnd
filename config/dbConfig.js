const sql = require('mssql');

// Konfigurasikan database config sesuai dengan authentication configuration di machine kalian!
const config = {
  user: 'linus',
  password: 'abcd1234',
  server: '127.0.0.1',
  port: 1433,
  database: 'Cinewave',
  options: {
    encrypt: false,
    trustServerCertificate: true
  }
};


async function connectToDatabase() {
    try {
        const pool = await sql.connect(config);
        console.log('Database connected');
        return pool;
    } catch (err) {
        console.error('Database connection failed', err);
        throw err;
    }
}

module.exports = { sql, connectToDatabase };