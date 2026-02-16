require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./models/db');
const libraryRoutes = require('./routes/library');
const mediaRoutes = require('./routes/media');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/library', libraryRoutes);
app.use('/api/media', mediaRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Syllabus API is running' });
});

app.listen(PORT, () => {
  console.log(`✓ Syllabus server running on http://localhost:${PORT}`);
});
