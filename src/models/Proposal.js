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
    // ZERO-TRUST TRL ENGINE VERIFICATION METRICS
    // =========================================================================
    verified_trl_score: { type: Number, default: 0 },
    technical_confidence: { type: Number, default: 0 },
    is_fraud_flagged: { type: Boolean, default: false },

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

    // =========================================================================
    // JURY ASSIGNMENT
    // =========================================================================
    assignedJury: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    assignedAt: { type: Date },
    juryReviewStatus: {
        type: String,
        enum: ["PENDING_ACCEPTANCE", "ACCEPTED", "DECLINED", "REVIEW_COMPLETED"],
        default: "PENDING_ACCEPTANCE"
    },

    juryTimeline: {
        m1Days: { type: Number },
        m2Days: { type: Number },
        m3Days: { type: Number }
    },

    // =========================================================================
    // TWO-STAGE WEIGHTED EVALUATION
    // =========================================================================
    juryScoreCard: {
        criteria: {
            innovation: { type: Number, max: 30 },
            feasibility: { type: Number, max: 20 },
            scalability: { type: Number, max: 20 }
        },
        totalScore: { type: Number, max: 70 }, // Out of 70
        hash: { type: String }, // Immutable SHA-256
        evaluatedAt: { type: Date }
    },
    officerScoreCard: {
        criteria: {
            budgetViability: { type: Number, max: 15 },
            implementationTimeline: { type: Number, max: 15 }
        },
        totalScore: { type: Number, max: 30 }, // Out of 30
        hash: { type: String }, // Immutable SHA-256
        evaluatedAt: { type: Date }
    },
    finalWeightedScore: { type: Number }, // (Jury/70 * 60) + (Officer/30 * 40)

    status: {
        type: String,
        enum: ["SUBMITTED", "JURY_EVALUATED", "OFFICER_EVALUATED", "SHORTLISTED", "SANDBOX_TESTED", "REJECTED", "AWARDED", "EVICTED_FROM_SANDBOX"],
        default: "SUBMITTED"
    }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);