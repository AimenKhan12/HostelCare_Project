// Small helper functions used by the routes.
const { q } = require('./db');

// Factory: builds the notification text for each type
function message(type, c) {
  if (type === 'NEW') return `New ${c.category} complaint #${c.id}`;
  if (type === 'ASSIGNED') return `Complaint #${c.id} was assigned to you`;
  if (type === 'STATUS') return `Your complaint #${c.id} is now ${c.status}`;
  return c.text;
}

// Saves one notification for every user id in the list
async function notify(userIds, type, c) {
  for (const id of userIds) {
    await q('INSERT INTO notifications (user_id, text) VALUES ($1, $2)', [id, message(type, c)]);
  }
}

// Auto-assignment: picks the staff member of this category with the least open work
async function assignStaff(category) {
  const rows = await q(
    `SELECT u.id FROM users u
     WHERE u.role = 'staff' AND u.category = $1
     ORDER BY (SELECT COUNT(*) FROM complaints c WHERE c.assigned_to = u.id AND c.status <> 'Resolved'), u.id
     LIMIT 1`, [category]);
  return rows[0] ? rows[0].id : null;
}

module.exports = { notify, assignStaff };
