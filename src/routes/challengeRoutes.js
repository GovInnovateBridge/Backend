const express = require('express');
const router = express.Router();
const { createChallenge, publishChallenge, startEvaluation } = require('../controllers/challengeController');
const { verifyToken, verifyNodal } = require('../middlewares/authMiddleware');

// POST /api/challenges/create
// Nodal Officer only
router.post('/create', verifyToken, verifyNodal, createChallenge);

// PATCH /api/challenges/:id/publish
// Nodal Officer only
router.patch('/:id/publish', verifyToken, verifyNodal, publishChallenge);

// PATCH /api/challenges/:id/evaluate
// Nodal Officer only
router.patch('/:id/evaluate', verifyToken, verifyNodal, startEvaluation);

module.exports = router;
