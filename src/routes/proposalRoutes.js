const express = require('express');
const router = express.Router();
const { submitProposal, getProposalsForChallenge, evaluateProposal, runSandboxTest, awardGrant, generateAgreement, signAgreement } = require('../controllers/proposalController');
const { verifyToken, verifyStartup, verifyJury, verifyNodal } = require('../middlewares/authMiddleware');
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

// POST /api/proposals/:id/sandbox-run
// Startup only
router.post('/:id/sandbox-run', verifyToken, verifyStartup, runSandboxTest);

// PATCH /api/proposals/:id/award
// Nodal Officer only
router.patch('/:id/award', verifyToken, verifyNodal, awardGrant);

// POST /api/proposals/:id/agreement/generate
// Nodal Officer only
router.post('/:id/agreement/generate', verifyToken, verifyNodal, generateAgreement);

// PATCH /api/proposals/:id/agreement/sign
// Startup only
router.patch('/:id/agreement/sign', verifyToken, verifyStartup, signAgreement);

module.exports = router;
