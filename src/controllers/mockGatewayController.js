const crypto = require('crypto');

// POST /api/mock/erupi/voucher
exports.generateErupiVoucher = (req, res) => {
    const { escrowId, milestoneCode, amount, purpose } = req.body;

    if (!escrowId || !milestoneCode || !amount) {
        return res.status(400).json({ message: "Missing required fields for e-RUPI voucher." });
    }

    const voucherId = `ERUPI-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const signedToken = crypto.randomBytes(32).toString('hex');

    return res.status(201).json({
        voucherId,
        signedToken,
        issuedAt: new Date().toISOString()
    });
};

// POST /api/mock/pfms/disburse
exports.disbursePFMS = (req, res) => {
    const { escrowId, milestoneCode, amount, beneficiaryAccount } = req.body;

    if (!escrowId || !milestoneCode || !amount || !beneficiaryAccount) {
        return res.status(400).json({ message: "Missing required fields for PFMS disbursement." });
    }

    const transactionRef = `PFMS-TXN-${crypto.randomBytes(6).toString('hex').toUpperCase()}`;

    return res.status(200).json({
        transactionRef,
        status: "SUCCESS",
        disbursedAt: new Date().toISOString()
    });
};