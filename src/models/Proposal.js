const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    submissionRefNumber: { type: String }, // e.g. "PROP-2026-99012"

    // =========================================================================
    // RICH JSON FORMATS (As per PDF specifications)
    // =========================================================================
    proposal_metadata: { type: mongoose.Schema.Types.Mixed },
    pre_requisite_clearance: { type: mongoose.Schema.Types.Mixed },
    assigned_evaluator_pool: { type: String },
    internal_db_meta: { type: mongoose.Schema.Types.Mixed },

    // COVER 1: ENVELOPE A (Technical Proposal)
    envelope_a_technical: { type: mongoose.Schema.Types.Mixed },

    // COVER 2: ENVELOPE B (Financial Proposal)
    envelope_b_financial: { type: mongoose.Schema.Types.Mixed },

    // Vault Lock status for Envelope B
    vaultLocked: { type: Boolean, default: true },

    // =========================================================================
    // SANDBOX TESTING & BENCHMARK METRICS
    // =========================================================================
    sandboxMetrics: {
        latencyMs: { type: Number },
        uptimePercent: { type: Number },
        accuracyScore: { type: Number },
        memoryUsageMb: { type: Number },
        lastRunAt: { type: Date }
    },

    // =========================================================================
    // AGREEMENT & SMART ESCROW
    // =========================================================================
    agreementStatus: {
        type: String,
        enum: ["NOT_GENERATED", "PENDING_SIGNATURE", "SIGNED"],
        default: "NOT_GENERATED"
    },
    escrowStatus: {
        type: String,
        enum: ["NOT_INITIATED", "FROZEN", "RELEASED"],
        default: "NOT_INITIATED"
    },
    agreementHash: { type: String }, // Stores dummy document hash
    agreementData: { type: mongoose.Schema.Types.Mixed }, // Detailed JSON Agreement

    status: {
        type: String,
        enum: ["SUBMITTED", "SHORTLISTED", "SANDBOX_TESTED", "REJECTED", "AWARDED"],
        default: "SUBMITTED"
    }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);