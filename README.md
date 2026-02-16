# Syllabus

Your personal media shelf — browse, save, and track movies, TV shows & books with live ratings.

## Setup

### 1. Get a TMDB API Key (free)
1. Go to [themoviedb.org](https://www.themoviedb.org/signup)
2. Create an account → Settings → API → Create → Get your API key
3. Paste it in `server/.env`

### 2. Install & Run
```bash
# Install all dependencies
npm run install-all

# Start both server & client
npm run dev
```

The app will open at **http://localhost:3000** with the API on port 5000.

## Features
- Browse trending & upcoming movies, TV shows, and books
- Search across all media types
- View details, ratings, and recommendations
- Save to your personal library
- Track status: Want / In Progress / Finished
- Live data from TMDB & Open Library APIs

## Tech Stack
- **Frontend:** React, React Router, Lucide icons
- **Backend:** Express, SQLite (better-sqlite3)
- **APIs:** TMDB (movies/TV), Open Library (books)
