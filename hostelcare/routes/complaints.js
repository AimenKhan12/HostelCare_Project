// Complaints: create, list, change status, reassign, rate
const router = require('express').Router();
const { q } = require('../db');
const { auth, only } = require('../auth');
const { CATEGORIES, STATUSES, PRIORITIES } = require('../config');
const { notify, assignStaff } = require('../services');

const SELECT = `SELECT c.*, r.name AS resident_name, r.room, s.name AS staff_name
  FROM complaints c JOIN users r ON r.id = c.resident_id LEFT JOIN users s ON s.id = c.assigned_to`;

router.use(auth);

// List: a resident sees own complaints, staff see assigned ones, admin sees all
router.get('/', async (req, res) => {
  const { id, role } = req.user;
  if (role === 'admin') return res.json(await q(`${SELECT} ORDER BY c.id DESC`));
  const column = role === 'resident' ? 'c.resident_id' : 'c.assigned_to';
  res.json(await q(`${SELECT} WHERE ${column} = $1 ORDER BY c.id DESC`, [id]));
});

// Facade: one call that saves the complaint, picks the staff and sends notifications
router.post('/', only('resident'), async (req, res) => {
  const { category, priority, visit_time, description } = req.body;
  if (!CATEGORIES.includes(category) || !PRIORITIES.includes(priority) || !String(description || '').trim()) {
    return res.status(400).json({ error: 'Please fill the form correctly' });
  }
  const staffId = await assignStaff(category);
  const c = (await q(
    'INSERT INTO complaints (resident_id, category, priority, visit_time, description, assigned_to) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',
    [req.user.id, category, priority, visit_time || 'Anytime', String(description).trim(), staffId]))[0];
  const admins = (await q("SELECT id FROM users WHERE role = 'admin'")).map(a => a.id);
  await notify(staffId ? [...admins, staffId] : admins, 'NEW', c);
  res.json({ complaint: c, assigned: !!staffId });
});

// Staff (own complaints) or admin changes the status
router.patch('/:id/status', only('staff', 'admin'), async (req, res) => {
  const { status } = req.body;
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Wrong status' });
  const c = (await q('SELECT * FROM complaints WHERE id = $1', [req.params.id]))[0];
  if (!c || (req.user.role === 'staff' && c.assigned_to !== req.user.id)) return res.status(403).json({ error: 'Not allowed' });
  await q('UPDATE complaints SET status = $1 WHERE id = $2', [status, c.id]);
  await notify([c.resident_id], 'STATUS', { id: c.id, status });
  res.json({ ok: true });
});

// Admin gives the complaint to another staff member of the same category
router.patch('/:id/assign', only('admin'), async (req, res) => {
  const c = (await q('SELECT * FROM complaints WHERE id = $1', [req.params.id]))[0];
  const s = c && (await q("SELECT id FROM users WHERE id = $1 AND role = 'staff' AND category = $2", [req.body.staff_id, c.category]))[0];
  if (!c || !s) return res.status(400).json({ error: 'Choose a staff member of the same category' });
  await q('UPDATE complaints SET assigned_to = $1 WHERE id = $2', [s.id, c.id]);
  await notify([s.id], 'ASSIGNED', c);
  res.json({ ok: true });
});

// Resident rates a resolved complaint (1 to 5 stars)
router.post('/:id/rate', only('resident'), async (req, res) => {
  const n = Number(req.body.rating);
  if (!(n >= 1 && n <= 5)) return res.status(400).json({ error: 'Rating must be 1 to 5' });
  const rows = await q("UPDATE complaints SET rating = $1 WHERE id = $2 AND resident_id = $3 AND status = 'Resolved' AND rating IS NULL RETURNING id", [n, req.params.id, req.user.id]);
  if (!rows.length) return res.status(400).json({ error: 'You cannot rate this complaint' });
  res.json({ ok: true });
});

module.exports = router;
