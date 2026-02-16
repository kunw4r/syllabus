const express = require('express');
const router = express.Router();
const db = require('../models/db');

// GET all library items (optional filter by media_type or status)
router.get('/', (req, res) => {
  const { media_type, status } = req.query;
  let query = 'SELECT * FROM library';
  const conditions = [];
  const params = [];

  if (media_type) {
    conditions.push('media_type = ?');
    params.push(media_type);
  }
  if (status) {
    conditions.push('status = ?');
    params.push(status);
  }
  if (conditions.length) {
    query += ' WHERE ' + conditions.join(' AND ');
  }
  query += ' ORDER BY added_at DESC';

  const items = db.prepare(query).all(...params);
  res.json(items);
});

// POST add item to library
router.post('/', (req, res) => {
  const { tmdb_id, openlibrary_key, media_type, title, poster_path, overview, rating, genres, release_date } = req.body;

  try {
    const stmt = db.prepare(`
      INSERT INTO library (tmdb_id, openlibrary_key, media_type, title, poster_path, overview, rating, genres, release_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(tmdb_id || null, openlibrary_key || null, media_type, title, poster_path, overview, rating, genres, release_date);
    res.status(201).json({ id: result.lastInsertRowid, message: 'Added to library' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(409).json({ error: 'Already in your library' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// PATCH update item status or user rating
router.patch('/:id', (req, res) => {
  const { status, user_rating } = req.body;
  const updates = [];
  const params = [];

  if (status) {
    updates.push('status = ?');
    params.push(status);
  }
  if (user_rating !== undefined) {
    updates.push('user_rating = ?');
    params.push(user_rating);
  }
  if (!updates.length) {
    return res.status(400).json({ error: 'Nothing to update' });
  }

  params.push(req.params.id);
  db.prepare(`UPDATE library SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  res.json({ message: 'Updated' });
});

// DELETE remove from library
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM library WHERE id = ?').run(req.params.id);
  res.json({ message: 'Removed from library' });
});

module.exports = router;
