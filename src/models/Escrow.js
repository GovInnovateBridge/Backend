const mongoose = require('mongoose');

const milestoneSchema = new mongoose.Schema({
    code: { type: String, enum: ["M1", "M2", "M3"], required: true },
    amount: { type: Number, required: true },
    status: {
        type: String,
        enum: ["PENDING", "CLAIMED", "APPROVED", "DEEMED_APPROVED", "RELEASED", "DISPUTED"],
        default: "PENDING"
    },
    claimedAt: { type: Date },
    deemedApprovalDeadline: { type: Date },
    approvedAt: { type: Date },
    releasedAt: { type: Date },
    pfmsTransactionRef: { type: String }
}, { _id: false });

const escrowSchema = new mongoose.Schema({
    proposal: { type: mongoose.Schema.Types.ObjectId, ref: "Proposal", required: true },
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
    milestones: [milestoneSchema]
}, { timestamps: true });

module.exports = mongoose.model('Escrow', escrowSchema);