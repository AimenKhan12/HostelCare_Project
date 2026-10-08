// Login check. Every protected route uses these two helpers.
const jwt = require('jsonwebtoken');

// auth: reads the token sent by the browser and finds out who the user is
function auth(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);   // { id, role }
    next();
  } catch {
    res.status(401).json({ error: 'Please log in again' });
  }
}

// only('admin') lets only admins in. only('staff','admin') lets both in.
const only = (...roles) => (req, res, next) =>
  roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Not allowed' });

module.exports = { auth, only };
