const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    
    envelope_a_technical: {
        rawText: { type: String, required: true },
        piiRedactedText: { type: String }, // Populated by ML mask-pii
        kpiVector: { type: Object } // Populated by ML for matchmaking
    },
    envelope_b_financial: {
        encryptedPayload: { type: String, required: true } // AES-encrypted blob
    },
    
    vaultLocked: { type: Boolean, default: true },
    unlockedAt: { type: Date },
    unlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    
    sandboxMetrics: {
        latencyMs: { type: Number },
        uptimePercent: { type: Number },
        accuracyScore: { type: Number },
        lastRunAt: { type: Date }
    },
    
    status: {
        type: String,
        enum: ["SUBMITTED", "SANDBOX_TESTED", "SHORTLISTED", "REJECTED", "AWARDED"],
        default: "SUBMITTED"
    }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);