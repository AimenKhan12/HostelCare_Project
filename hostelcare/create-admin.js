// Run once to make the first admin:  npm run create-admin -- "Warden Name" admin@email.com Password123
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { q, pool } = require('./db');

const [name, email, password] = process.argv.slice(2);
if (!name || !email || !password) {
  console.log('Use: npm run create-admin -- "Name" email password');
  process.exit(1);
}

(async () => {
  const hash = await bcrypt.hash(password, 10);
  await q("INSERT INTO users (name, email, password_hash, role) VALUES ($1, $2, $3, 'admin')", [name, email.toLowerCase(), hash]);
  console.log('Admin created. You can log in now.');
  await pool.end();
})().catch(e => { console.log('Error:', e.message); process.exit(1); });
