const axios = require('axios');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Circuit Breaker / Fallback Wrapper
 * Prevents the Node.js backend from crashing if the Python ML microservice is down.
 */
async function withFallback(apiCallPromise, fallbackValue, operationName) {
    try {
        return await apiCallPromise;
    } catch (error) {
        console.warn(`⚠️ [ML Circuit Breaker] ${operationName} failed or unavailable. Using fallback.`);
        if (error.code === 'ECONNREFUSED') {
            console.warn(`   -> ML Server unreachable at ${ML_BASE_URL}`);
        } else {
            console.warn(`   -> Error: ${error.message}`);
        }
        return fallbackValue;
    }
}

/**
 * 1. Extract KPIs from a raw problem statement
 * Called during Challenge Creation
 */
async function extractKPIs(problemStatementRaw) {
    const fallback = {
        kpis: {
            detected_keywords: ["AI", "Blockchain", "IoT", "Data"], // Default fakes
            complexity_level: "Medium"
        },
        confidence: 0
    };

    const call = axios.post(`${ML_BASE_URL}/extract-kpis`, {
        text: problemStatementRaw
    }, { timeout: 8000 }).then(res => res.data);

    return await withFallback(call, fallback, "extractKPIs");
}

/**
 * 2. Mask PII and generate KPI Vector from a Technical Envelope
 * Called during Proposal Submission
 */
async function maskPII(rawText) {
    const fallback = {
        redactedText: rawText, // Fallback returns original text but flags it
        piiReviewPending: true,
        kpiVector: [0.1, 0.5, 0.3, 0.8, 0.2] // Fake 5-dimensional vector for demo
    };

    const call = axios.post(`${ML_BASE_URL}/mask-pii`, {
        text: rawText
    }, { timeout: 8000 }).then(res => res.data);

    return await withFallback(call, fallback, "maskPII");
}

/**
 * 3. Vector Search Matchmaking
 * Called by Matchmaking Dashboard
 */
async function vectorSearch(challengeKpiVector, candidateVectors) {
    // candidateVectors shape: [{ proposalId, vector: [...] }]
    const fallback = {
        ranked: candidateVectors.map((c, i) => ({
            proposalId: c.proposalId,
            matchScore: 0.95 - (i * 0.05) // Fake descending score
        }))
    };

    const call = axios.post(`${ML_BASE_URL}/vector-search`, {
        challengeKpiVector,
        candidateVectors
    }, { timeout: 8000 }).then(res => res.data);

    return await withFallback(call, fallback, "vectorSearch");
}

module.exports = {
    extractKPIs,
    maskPII,
    vectorSearch
};
