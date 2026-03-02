const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const wishesRoutes = require('./routes/wishes');
const tagsRoutes = require('./routes/tags');
const pool = require('./config/database');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration - credentials:true required for session cookies
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'reflexio-dev-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false,
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.execute('SELECT 1');
    res.json({ status: 'ok', message: 'Reflexio Backend API is running', database: 'connected' });
  } catch (error) {
    res.json({ status: 'ok', message: 'Reflexio Backend API is running', database: 'disconnected' });
  }
});

app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Reflexio Backend API' });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/wishes', wishesRoutes);
app.use('/api/tags', tagsRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
