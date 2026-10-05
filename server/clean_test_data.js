
const { Pool } = require('pg');
require('dotenv').config({ path: 'server/.env' });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function cleanDB() {
  try {
    console.log('Connecting to database ' + process.env.DB_NAME + ' at ' + process.env.DB_HOST + '...');
    await pool.query('TRUNCATE TABLE companies CASCADE;');
    console.log('Test data successfully removed! All leads cleared.');
  } catch (err) {
    console.error('Error cleaning database:', err);
  } finally {
    await pool.end();
  }
}

cleanDB();

