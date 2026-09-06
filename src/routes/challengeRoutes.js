const express = require('express');
const router = express.Router();
const { createChallenge, publishChallenge, startEvaluation, startSandbox, shortlistTop3 } = require('../controllers/challengeController');
const { getMatches } = require('../controllers/matchmakingController');
const { verifyToken, verifyNodal } = require('../middlewares/authMiddleware');

// POST /api/challenges/create
// Nodal Officer only
router.post('/create', verifyToken, verifyNodal, createChallenge);

// GET /api/challenges/:id/matches
// Fetch ML ranked match proposals for a challenge
router.get('/:id/matches', verifyToken, getMatches);

// PATCH /api/challenges/:id/publish
// Nodal Officer only
router.patch('/:id/publish', verifyToken, verifyNodal, publishChallenge);

// PATCH /api/challenges/:id/evaluate
// Nodal Officer only
router.patch('/:id/evaluate', verifyToken, verifyNodal, startEvaluation);

// PATCH /api/challenges/:id/sandbox
// Nodal Officer only (activates sandbox phase)
router.patch('/:id/sandbox', verifyToken, verifyNodal, startSandbox);

// PATCH /api/challenges/:id/shortlist-top-3
// Nodal Officer only
router.patch('/:id/shortlist-top-3', verifyToken, verifyNodal, shortlistTop3);

module.exports = router;
