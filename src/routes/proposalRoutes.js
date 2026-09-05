const express = require('express');
const router = express.Router();
const { submitProposal, getProposalsForChallenge, evaluateProposal, officerEvaluateProposal, awardGrant, generateAgreement, signAgreement, acceptJuryAssignment, declineJuryAssignment } = require('../controllers/proposalController');
const { runSandbox, getSandboxStatus } = require('../controllers/sandboxController');
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

// PATCH /api/proposals/:id/officer/evaluate
// Nodal Officer only
router.patch('/:id/officer/evaluate', verifyToken, verifyNodal, officerEvaluateProposal);

// POST /api/proposals/:id/run-sandbox
// Startup only
router.post('/:id/run-sandbox', verifyToken, verifyStartup, runSandbox);

// GET /api/proposals/:id/sandbox-status
// Any authenticated user
router.get('/:id/sandbox-status', verifyToken, getSandboxStatus);

// PATCH /api/proposals/:id/award
// Nodal Officer only
router.patch('/:id/award', verifyToken, verifyNodal, awardGrant);

// POST /api/proposals/:id/agreement/generate
// Nodal Officer only
router.post('/:id/agreement/generate', verifyToken, verifyNodal, generateAgreement);

// PATCH /api/proposals/:id/agreement/sign
// Startup only
router.patch('/:id/agreement/sign', verifyToken, verifyStartup, signAgreement);

// PATCH /api/proposals/:id/jury/accept
// Jury only
router.patch('/:id/jury/accept', verifyToken, verifyJury, acceptJuryAssignment);

// PATCH /api/proposals/:id/jury/decline
// Jury only
router.patch('/:id/jury/decline', verifyToken, verifyJury, declineJuryAssignment);

module.exports = router;
