const express = require('express');
const Database = require('better-sqlite3');
const { nanoid } = require('nanoid');
require('dotenv').config();

const app = express();
const db = new Database('data.db');

app.use(express.json());
app.use(express.static('public'));

// ----------------------
// Buat table kalau tak ada
// ----------------------
db.prepare(`
  CREATE TABLE IF NOT EXISTS links (
    id TEXT PRIMARY KEY,
    targetUrl TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    linkId TEXT,
    ip TEXT,
    userAgent TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

// ----------------------
// API untuk create short link
// ----------------------
app.post('/api/create', (req, res) => {
  const { targetUrl } = req.body;
  if (!targetUrl) {
    return res.status(400).json({ error: "targetUrl is required" });
  }
  const id = nanoid(6);
  db.prepare('INSERT INTO links (id, targetUrl) VALUES (?, ?)').run(id, targetUrl);
  res.json({ id, shortUrl: `/${id}` });
});

// ----------------------
// API senarai semua link
// ----------------------
app.get('/api/links', (req, res) => {
  const rows = db.prepare('SELECT * FROM links ORDER BY createdAt DESC').all();
  res.json(rows);
});

// ----------------------
// API tengok log klik
// ----------------------
app.get('/api/events/:id', (req, res) => {
  const id = req.params.id;
  const rows = db.prepare('SELECT * FROM events WHERE linkId = ? ORDER BY createdAt DESC').all(id);
  res.json(rows);
});

// ----------------------
// Handle bila orang buka short link
// ----------------------
app.get('/:id', (req, res) => {
  const id = req.params.id;
  const link = db.prepare('SELECT * FROM links WHERE id = ?').get(id);
  
  if (!link) {
    return res.status(404).send('Link not found');
  }

  // Log event (IP + UserAgent)
  db.prepare('INSERT INTO events (linkId, ip, userAgent) VALUES (?, ?, ?)')
    .run(id, req.ip, req.headers['user-agent']);

  // Redirect ke landing page + bawa URL asal dalam query
  res.redirect(`/landing.html?target=${encodeURIComponent(link.targetUrl)}`);
});

// ----------------------
// Start server
// ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
