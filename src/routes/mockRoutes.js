const express = require('express');
const router = express.Router();
const { disbursePFMS, fetchDPIITDetails } = require('../controllers/mockGatewayController');

// PFMS Disbursement
router.post('/pfms/disburse', disbursePFMS);

// API Setu / DPIIT Registry Fetch
router.get('/dpiit/:dpiitNumber', fetchDPIITDetails);

module.exports = router;