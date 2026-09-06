const axios = require('axios');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 30000;

/**
 * Circuit Breaker Wrapper
 */
async function withFallback(apiCallPromise, fallbackValue, operationName) {
    try {
        return await apiCallPromise;
    } catch (error) {
        console.warn(`[ML Circuit Breaker] ${operationName} failed. Using fallback.`);
        if (error.code === 'ECONNREFUSED') {
            console.warn(`   -> ML Server unreachable at ${ML_BASE_URL}`);
        } else {
            console.warn(`   -> ${error.response?.data?.detail || error.message}`);
        }
        return fallbackValue;
    }
}

// ============================================================================
// S1: SEMANTIC TRIAGE — POST /semantic-triage
// ============================================================================
exports.semanticTriage = async (problemStatement, proposals) => {
    // proposals shape: [{ id: "mongoId", text: "proposal pitch text..." }, ...]
    const fallback = {
        matches: proposals.map((p, i) => ({
            id: p.id,
            score: Math.max(0.95 - (i * 0.05), 0.5) // Fake descending score
        })),
        _fallback: true
    };

    const call = axios.post(`${ML_BASE_URL}/semantic-triage`, {
        problem_statement: problemStatement,
        proposals: proposals
    }, { timeout: TIMEOUT_MS }).then(res => res.data);

    return await withFallback(call, fallback, "semanticTriage");
};

// ============================================================================
// S2: GENERATE SYNTHETIC DATA — POST /generate-synthetic-data
// ============================================================================
exports.generateSyntheticData = async (problemStatement) => {
    const fallback = [
        { test_id: 1, payload: { input: "sample_data", expected: "response" }, status: "mock" },
        { test_id: 2, payload: { input: "sample_data_2", expected: "response_2" }, status: "mock" }
    ];

    const call = axios.post(`${ML_BASE_URL}/generate-synthetic-data`, {
        problem_statement: problemStatement
    }, { timeout: TIMEOUT_MS }).then(res => res.data);

    return await withFallback(call, fallback, "generateSyntheticData");
};

// ============================================================================
// S3: REDACT PROPOSAL — POST /redact-proposal
// ============================================================================
exports.redactProposal = async (proposalText) => {
    // Fallback: basic regex redaction if ML is offline
    let fallbackText = proposalText;
    fallbackText = fallbackText.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[REDACTED_ENTITY]');
    fallbackText = fallbackText.replace(/\b\d{10}\b/g, '[REDACTED_ENTITY]');

    const fallback = {
        redacted_text: fallbackText,
        _fallback: true
    };

    const call = axios.post(`${ML_BASE_URL}/redact-proposal`, {
        proposal_text: proposalText
    }, { timeout: TIMEOUT_MS }).then(res => res.data);

    return await withFallback(call, fallback, "redactProposal");
};
