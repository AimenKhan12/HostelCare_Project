// Notice board and notifications
const router = require('express').Router();
const { q } = require('../db');
const { auth, only } = require('../auth');

// Everyone can read the notice board
router.get('/notices', auth, async (req, res) => {
  res.json(await q('SELECT * FROM notices ORDER BY id DESC LIMIT 30'));
});

// Admin posts a notice. Residents and staff get a notification.
router.post('/notices', auth, only('admin'), async (req, res) => {
  const text = String(req.body.text || '').trim();
  if (!text) return res.status(400).json({ error: 'Write the notice first' });
  await q('INSERT INTO notices (text) VALUES ($1)', [text]);
  await q("INSERT INTO notifications (user_id, text) SELECT id, $1 FROM users WHERE role <> 'admin'", ['New notice: ' + text]);
  res.json({ ok: true });
});

// My latest notifications and the unread count
router.get('/notifications', auth, async (req, res) => {
  const items = await q('SELECT * FROM notifications WHERE user_id = $1 ORDER BY id DESC LIMIT 50', [req.user.id]);
  const unread = (await q('SELECT COUNT(*)::int AS n FROM notifications WHERE user_id = $1 AND is_read = false', [req.user.id]))[0].n;
  res.json({ items, unread });
});

// Mark all my notifications as read
router.post('/notifications/read', auth, async (req, res) => {
  await q('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
  res.json({ ok: true });
});

module.exports = router;
