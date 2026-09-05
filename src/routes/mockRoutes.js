const express = require('express');
const router = express.Router();
const { 
    generateErupiVoucher, 
    disbursePFMS 
} = require('../controllers/mockGatewayController');

router.post('/erupi/voucher', generateErupiVoucher);
router.post('/pfms/disburse', disbursePFMS);

module.exports = router;