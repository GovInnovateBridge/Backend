const crypto = require('crypto');

// Pure helper function for internal calls (Cron & Controller)
exports.processPFMSDisbursement = (escrowId, milestoneCode, amount) => {
    const transactionRef = `PFMS-TXN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;
    return {
        transactionRef,
        status: "SUCCESS",
        disbursedAt: new Date().toISOString()
    };
};

// Express Route Handler for POST /api/mock/pfms/disburse
exports.disbursePFMS = (req, res) => {
    const { escrowId, milestoneCode, amount, beneficiaryAccount } = req.body;

    if (!escrowId || !milestoneCode || !amount || !beneficiaryAccount) {
        return res.status(400).json({ message: "Missing required fields for PFMS disbursement." });
    }

    const data = exports.processPFMSDisbursement(escrowId, milestoneCode, amount);
    return res.status(200).json(data);
};