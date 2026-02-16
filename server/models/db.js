const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '..', 'syllabus.db'));

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS library (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER,
    openlibrary_key TEXT,
    media_type TEXT NOT NULL CHECK(media_type IN ('movie', 'tv', 'book')),
    title TEXT NOT NULL,
    poster_path TEXT,
    overview TEXT,
    rating REAL,
    user_rating INTEGER,
    status TEXT DEFAULT 'want' CHECK(status IN ('want', 'watching', 'finished')),
    genres TEXT,
    release_date TEXT,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tmdb_id, media_type),
    UNIQUE(openlibrary_key)
  );
`);

module.exports = db;
