const express = require('express');
const router = express.Router();
const { getPublicChallenges, getPublicChallengeById, getChallengeStatus } = require('../controllers/publicController');

// GET /api/challenges/public
router.get('/', getPublicChallenges);

// GET /api/challenges/public/:challengeId
router.get('/:challengeId', getPublicChallengeById);

// GET /api/challenges/public/:challengeId/status
router.get('/:challengeId/status', getChallengeStatus);

module.exports = router;
