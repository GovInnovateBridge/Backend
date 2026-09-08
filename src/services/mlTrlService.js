const axios = require('axios');
const FormData = require('form-data');

const ML_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';
const TIMEOUT_MS = 30000; // 30s for LLM calls

/**
 * Circuit Breaker Wrapper
 * Prevents backend crash if ML microservice is offline.
 */
async function withFallback(apiCallPromise, fallbackValue, operationName) {
    try {
        return await apiCallPromise;
    } catch (error) {
        console.error(`\n[ERROR - ML Circuit Breaker] ${operationName} failed!`);
        if (error.code === 'ECONNREFUSED') {
            console.error(`   -> ML Server unreachable at ${ML_BASE_URL}`);
        } else {
            console.error(`   -> API Error:`, error.response?.data || error.message);
            console.error(`   -> Hint: Check if your GEMINI_API_KEY in ml-sahyog/.env is valid.`);
        }
        console.warn(`   -> Returning fallback data to prevent crash.\n`);
        return fallbackValue;
    }
}

// ============================================================================
// 1. GENERATE QUESTIONS - POST /generate-questions
// ============================================================================
exports.generateQuestions = async (startupPitch, claimedTrl, domain = 'SOFTWARE') => {
    const fallback = {
        questions: [
            "Describe the core architecture of your solution.",
            "What testing methodology have you implemented?",
            "How does your solution handle failure scenarios?"
        ],
        tier_name: "Fallback Tier",
        _fallback: true
    };

    const call = axios.post(`${ML_BASE_URL}/generate-questions`, {
        startup_pitch: startupPitch,
        claimed_trl: claimedTrl,
        domain: domain
    }, { timeout: TIMEOUT_MS }).then(res => res.data);

    return await withFallback(call, fallback, "generateQuestions");
};

// ============================================================================
// 2. EVALUATE SOFTWARE TRL — POST /evaluate-software-trl
// ============================================================================
exports.evaluateSoftwareTRL = async (questions, userAnswers, claimedTrl, backendProofs) => {
    const fallback = {
        verified_trl: claimedTrl,
        is_fraud_detected: false,
        technical_confidence: 0,
        downgrade_reason: null,
        answer_scores: [],
        _fallback: true
    };

    const call = axios.post(`${ML_BASE_URL}/evaluate-software-trl`, {
        questions,
        user_answers: userAnswers,
        claimed_trl: claimedTrl,
        backend_proofs: backendProofs
    }, { timeout: TIMEOUT_MS }).then(res => res.data);

    return await withFallback(call, fallback, "evaluateSoftwareTRL");
};

// ============================================================================
// 3. VERIFY HARDWARE DOC — POST /hardware/verify-doc (multipart/form-data)
// ============================================================================
exports.verifyHardwareDoc = async (fileBuffer, originalFilename) => {
    const fallback = {
        verified: false,
        confidence: 0,
        _fallback: true
    };

    const form = new FormData();
    form.append('file', fileBuffer, originalFilename);

    const call = axios.post(`${ML_BASE_URL}/hardware/verify-doc`, form, {
        headers: { ...form.getHeaders() },
        timeout: TIMEOUT_MS,
        maxContentLength: 50 * 1024 * 1024
    }).then(res => res.data);

    return await withFallback(call, fallback, "verifyHardwareDoc");
};

// ============================================================================
// 4. VERIFY HARDWARE VIDEO — POST /hardware/verify-video (multipart/form-data)
// ============================================================================
exports.verifyHardwareVideo = async (fileBuffer, originalFilename, expectedOtp) => {
    const fallback = {
        verified: false,
        otp_matched: false,
        hardware_detected: "ML service unavailable",
        _fallback: true
    };

    if (!expectedOtp) {
        throw new Error("expectedOtp is required for video verification.");
    }

    const form = new FormData();
    form.append('file', fileBuffer, originalFilename);
    form.append('expected_otp', expectedOtp);

    const call = axios.post(`${ML_BASE_URL}/hardware/verify-video`, form, {
        headers: { ...form.getHeaders() },
        timeout: 60000, // 60s — video processing is slow
        maxContentLength: 50 * 1024 * 1024
    }).then(res => res.data);

    return await withFallback(call, fallback, "verifyHardwareVideo");
};
