const mongoose = require('mongoose');

const proposalSchema = new mongoose.Schema({
    challenge: { type: mongoose.Schema.Types.ObjectId, ref: "Challenge", required: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    submissionRefNumber: { type: String }, // e.g. "PROP-2026-99012"

    // =========================================================================
    // COVER 1: ENVELOPE A (Technical Proposal - PII Masked for Jury)
    // =========================================================================
    envelope_a_technical: {
        dpiitNumber: { type: String, required: true }, // Startup India DPIIT Recognition No.
        startupName: { type: String },                 // Auto-fetched or verified via DPIIT
        executiveSummary: { type: String, required: true },
        techStack: [{ type: String }],                // Tech Stack (e.g., ["YOLOv8", "PyTorch", "TensorRT", "Node.js"])
        technicalArchitecture: { type: String, required: true },
        implementationPlan: { type: String },
        
        rawText: { type: String, required: true },
        piiRedactedText: { type: String },           // Redacted text by ML Masker for Jury evaluation
        kpiMatchVector: { type: Object }              // Vector similarity match by ML
    },

    // =========================================================================
    // COVER 2: ENVELOPE B (Financial Proposal / Vault Encrypted)
    // =========================================================================
    envelope_b_financial: {
        trialBudgetInr: { type: Number, required: true },          // Trial / Pilot phase budget
        commercialUnitBudgetInr: { type: Number, required: true }, // Commercial per-unit / full deployment budget
        totalGrantRequestedInr: { type: Number, required: true },   // Total grant funding requested
        
        milestones: [{
            milestoneCode: { type: String },
            paymentPercentage: { type: Number },
            amountInr: { type: Number },
            deliverableTarget: { type: String }
        }],
        
        encryptedPayload: { type: String }, // AES-256 encrypted financial blob
        vaultLocked: { type: Boolean, default: true },
        unlockedAt: { type: Date },
        unlockedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
    },

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

    status: {
        type: String,
        enum: ["SUBMITTED", "SHORTLISTED", "SANDBOX_TESTED", "REJECTED", "AWARDED"],
        default: "SUBMITTED"
    }
}, { timestamps: true });

module.exports = mongoose.model('Proposal', proposalSchema);