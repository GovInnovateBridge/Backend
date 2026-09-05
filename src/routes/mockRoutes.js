const express = require('express');
const router = express.Router();
const { disbursePFMS } = require('../controllers/mockGatewayController');

router.post('/pfms/disburse', disbursePFMS);

module.exports = router;