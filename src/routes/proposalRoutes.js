const express = require('express');
const router = express.Router();
const { submitProposal, getProposalsForChallenge, evaluateProposal } = require('../controllers/proposalController');
const { verifyToken, verifyStartup, verifyJury } = require('../middlewares/authMiddleware');
const lockEnvelopeB = require('../middlewares/lockEnvelopeBMiddleware');

// POST /api/proposals/submit
// Startup Founder only
router.post('/submit', verifyToken, verifyStartup, submitProposal);

// GET /api/proposals/challenge/:challengeId
// Jury or Nodal Officer fetches proposals (with Envelope B lock)
router.get('/challenge/:challengeId', verifyToken, lockEnvelopeB, getProposalsForChallenge);

// PATCH /api/proposals/:id/evaluate
// Jury only
router.patch('/:id/evaluate', verifyToken, verifyJury, evaluateProposal);

module.exports = router;
