// Main file. It starts the server and connects the route files.
require('dotenv').config();
const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static('public'));            // the website pages (HTML, CSS, JS)

app.use('/api', require('./routes/users'));
app.use('/api/complaints', require('./routes/complaints'));
app.use('/api', require('./routes/extras'));
app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Any unexpected error ends up here
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error. Please try again.' });
});

module.exports = app;                          // Vercel uses this
if (require.main === module) {                 // running on your own laptop
  app.listen(process.env.PORT || 3000, () => console.log('Open http://localhost:3000'));
}
