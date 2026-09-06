const express = require('express');
const router = express.Router();
const { runSandbox, getSandboxStatus } = require('../controllers/sandboxController');
const { verifyToken, verifyRole } = require('../middlewares/authMiddleware');

router.post('/:id/run', verifyToken, verifyRole(['STARTUP', 'STARTUP_FOUNDER']), runSandbox);
router.get('/:id/status', verifyToken, getSandboxStatus);

module.exports = router;
