// Accounts: signup, login, password and staff management
const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { q } = require('../db');
const { auth, only } = require('../auth');
const { CATEGORIES } = require('../config');
const { assignStaff } = require('../services');

const makeToken = u => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = u => ({ id: u.id, name: u.name, email: u.email, role: u.role, category: u.category, room: u.room });

// Resident creates an account (only residents can sign up)
router.post('/signup', async (req, res) => {
  const { name, email, password, room } = req.body;
  if (!name || !email || !password || !room) return res.status(400).json({ error: 'Fill in every field' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const mail = String(email).toLowerCase().trim();
  if ((await q('SELECT id FROM users WHERE email = $1', [mail])).length) {
    return res.status(400).json({ error: 'This email is already registered' });
  }
  const hash = await bcrypt.hash(String(password), 10);
  const rows = await q(
    "INSERT INTO users (name, email, password_hash, role, room) VALUES ($1, $2, $3, 'resident', $4) RETURNING *",
    [String(name).trim(), mail, hash, String(room).trim()]);
  res.json({ token: makeToken(rows[0]), user: publicUser(rows[0]) });
});

// Login with email, password and the role card the user chose
router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  const rows = await q('SELECT * FROM users WHERE email = $1', [String(email || '').toLowerCase().trim()]);
  const u = rows[0];
  const ok = u && await bcrypt.compare(String(password || ''), u.password_hash);
  if (!ok || u.role !== role) return res.status(401).json({ error: 'Wrong email, password or role' });
  res.json({ token: makeToken(u), user: publicUser(u) });
});

// Change my own password
router.post('/password', auth, async (req, res) => {
  const { old, next } = req.body;
  const u = (await q('SELECT * FROM users WHERE id = $1', [req.user.id]))[0];
  if (!u || !(await bcrypt.compare(String(old || ''), u.password_hash))) return res.status(400).json({ error: 'Current password is wrong' });
  if (String(next || '').length < 6) return res.status(400).json({ error: 'New password must be at least 6 characters' });
  await q('UPDATE users SET password_hash = $1 WHERE id = $2', [await bcrypt.hash(String(next), 10), u.id]);
  res.json({ ok: true });
});

// Admin: list staff with their open work
router.get('/staff', auth, only('admin'), async (req, res) => {
  res.json(await q(
    `SELECT u.id, u.name, u.email, u.category,
       (SELECT COUNT(*) FROM complaints c WHERE c.assigned_to = u.id AND c.status <> 'Resolved')::int AS open_count
     FROM users u WHERE u.role = 'staff' ORDER BY u.category, u.name`));
});

// Admin: add a staff member
router.post('/staff', auth, only('admin'), async (req, res) => {
  const { name, email, password, category } = req.body;
  if (!name || !email || !password || !CATEGORIES.includes(category)) return res.status(400).json({ error: 'Fill in every field' });
  if (String(password).length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const mail = String(email).toLowerCase().trim();
  if ((await q('SELECT id FROM users WHERE email = $1', [mail])).length) return res.status(400).json({ error: 'This email is already registered' });
  await q("INSERT INTO users (name, email, password_hash, role, category) VALUES ($1, $2, $3, 'staff', $4)",
    [String(name).trim(), mail, await bcrypt.hash(String(password), 10), category]);
  res.json({ ok: true });
});

// Admin: remove a staff member. Their open complaints go to another staff member of the same category.
router.delete('/staff/:id', auth, only('admin'), async (req, res) => {
  const open = await q("SELECT id, category FROM complaints WHERE assigned_to = $1 AND status <> 'Resolved'", [req.params.id]);
  await q("DELETE FROM users WHERE id = $1 AND role = 'staff'", [req.params.id]);
  for (const c of open) {
    const staffId = await assignStaff(c.category);
    if (staffId) await q('UPDATE complaints SET assigned_to = $1 WHERE id = $2', [staffId, c.id]);
  }
  res.json({ ok: true });
});

module.exports = router;
