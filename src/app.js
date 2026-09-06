const express = require('express');
const cors = require('cors');

const app = express();

// Basic Middleware
app.use(express.json());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

// Mount Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/challenges/public', require('./routes/publicRoutes'));
app.use('/api/challenges', require('./routes/challengeRoutes'));
app.use('/api/proposals', require('./routes/proposalRoutes'));
app.use('/api/notifications', require('./routes/notificationRoutes'));
app.use('/api/mock', require('./routes/mockRoutes'));
app.use('/api/escrow', require('./routes/escrowRoutes'));
app.use('/api/sandbox', require('./routes/sandboxRoutes'));
module.exports = app;
