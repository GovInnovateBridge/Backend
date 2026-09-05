const axios = require('axios');
const FormData = require('form-data');

// Ensure this matches where the Python FastAPI is running
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

/**
 * Evaluates Software TRL (No files, just JSON data)
 */
exports.evaluateSoftwareTRL = async (pitchData, claimedTrl, backendProofs) => {
    try {
        const payload = {
            startup_pitch: pitchData,
            claimed_trl: claimedTrl,
            backend_proofs: backendProofs
        };

        const response = await axios.post(`${ML_SERVICE_URL}/evaluate-software-trl`, payload);
        return response.data; 
        // Expected ML Response: { is_fraud_detected: boolean, final_verified_trl: number, technical_confidence: number }
    } catch (error) {
        console.error("ML Service Software TRL Error:", error.response?.data || error.message);
        throw new Error("Failed to evaluate Software TRL. AI Engine might be offline.");
    }
};

/**
 * Verifies Hardware TRL (Uploads File Buffer to ML)
 */
exports.verifyHardwareTRL = async (fileBuffer, originalFilename, expectedOtp = null, isVideo = false) => {
    try {
        const form = new FormData();
        form.append('file', fileBuffer, originalFilename);

        let endpoint = `${ML_SERVICE_URL}/hardware/verify-doc`; // TRL 1-3 CAD Check

        if (isVideo) {
            // TRL 4-6 Hostage Video Check
            if (!expectedOtp) throw new Error("expectedOtp is required for video verification");
            form.append('expected_otp', expectedOtp);
            endpoint = `${ML_SERVICE_URL}/hardware/verify-video`;
        }

        const response = await axios.post(endpoint, form, {
            headers: { ...form.getHeaders() }
        });

        return response.data;
        // Expected ML Response: { verified: boolean, confidence: number }
    } catch (error) {
        console.error("ML Service Hardware TRL Error:", error.response?.data || error.message);
        throw new Error("Failed to verify Hardware TRL. AI Engine might be offline.");
    }
};
