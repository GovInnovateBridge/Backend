const mongoose = require('mongoose');

const challengeSchema = new mongoose.Schema({
    title: { type: String, required: true },
    problemStatementRaw: { type: String, required: true },
    extractedKPIs: { type: Object }, // Populated later by the ML microservice
    status: {
        type: String,
        enum: ["DRAFT", "PUBLISHED", "EVALUATING", "SANDBOX_ACTIVE", "CLOSED"],
        default: "DRAFT"
    },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    publishedAt: { type: Date },
    evaluationDeadline: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Challenge', challengeSchema);