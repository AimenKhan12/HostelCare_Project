// Database connection (PostgreSQL on Neon).
// Singleton: this file runs once, so every other file shares the same pool.
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 3 });

// q(sql, values) runs a query and gives back the rows
const q = (sql, values) => pool.query(sql, values).then(r => r.rows);

module.exports = { pool, q };
