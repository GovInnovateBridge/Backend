const express = require('express');
const router = express.Router();
const { submitProposal } = require('../controllers/proposalController');
const { verifyToken, verifyStartup } = require('../middlewares/authMiddleware');

// POST /api/proposals/submit
// Startup Founder only
router.post('/submit', verifyToken, verifyStartup, submitProposal);

module.exports = router;
