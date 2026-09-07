const express = require('express');
const router = express.Router();
const { verifyToken, verifyStartup } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/uploadMiddleware');
const mlTrlService = require('../services/mlTrlService');

// POST /api/trl/generate-questions
// Standalone endpoint for the TRL Quiz page
router.post('/generate-questions', verifyToken, verifyStartup, async (req, res) => {
    try {
        const { startup_pitch, claimed_trl } = req.body;
        if (!startup_pitch || !claimed_trl) {
            return res.status(400).json({ message: 'startup_pitch and claimed_trl are required.' });
        }
        const result = await mlTrlService.generateQuestions(startup_pitch, claimed_trl);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error generating TRL questions:", error);
        res.status(500).json({ message: 'Failed to generate questions.' });
    }
});

// POST /api/trl/evaluate-software
// Standalone endpoint for submitting quiz answers for verification
router.post('/evaluate-software', verifyToken, verifyStartup, async (req, res) => {
    try {
        const { questions, user_answers, claimed_trl, backend_proofs } = req.body;
        if (!questions || !user_answers || !claimed_trl) {
            return res.status(400).json({ message: 'questions, user_answers, and claimed_trl are required.' });
        }
        const result = await mlTrlService.evaluateSoftwareTRL(questions, user_answers, claimed_trl, backend_proofs || {});
        res.status(200).json(result);
    } catch (error) {
        console.error("Error evaluating software TRL:", error);
        res.status(500).json({ message: 'Failed to evaluate TRL.' });
    }
});

// POST /api/trl/hardware/verify-doc (multipart)
router.post('/hardware/verify-doc', verifyToken, verifyStartup, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File is required.' });
        }
        const result = await mlTrlService.verifyHardwareDoc(req.file.buffer, req.file.originalname);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error verifying hardware doc:", error);
        res.status(500).json({ message: 'Failed to verify document.' });
    }
});

// POST /api/trl/hardware/verify-video (multipart)
router.post('/hardware/verify-video', verifyToken, verifyStartup, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'File is required.' });
        }
        const expectedOtp = req.body.expected_otp;
        if (!expectedOtp) {
            return res.status(400).json({ message: 'expected_otp is required.' });
        }
        const result = await mlTrlService.verifyHardwareVideo(req.file.buffer, req.file.originalname, expectedOtp);
        res.status(200).json(result);
    } catch (error) {
        console.error("Error verifying hardware video:", error);
        res.status(500).json({ message: 'Failed to verify video.' });
    }
});

// GET /api/trl/health
router.get('/health', async (req, res) => {
    try {
        const axios = require('axios');
        const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        const mlRes = await axios.get(ML_BASE_URL, { timeout: 5000 });
        res.json({ status: 'ok', ml_status: mlRes.data?.status || 'connected' });
    } catch {
        res.json({ status: 'ok', ml_status: 'unreachable' });
    }
});

module.exports = router;
