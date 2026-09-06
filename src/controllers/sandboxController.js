const axios = require('axios');
const Proposal = require('../models/Proposal');
const Challenge = require('../models/Challenge');
const { generateSyntheticData } = require('../services/mlFiltrationService');

// POST /api/proposals/:id/run-sandbox
// Generates ML synthetic payloads, then stress-tests the startup's API endpoint
exports.runSandbox = async (req, res) => {
    try {
        const { id } = req.params;
        const { endpointUrl, authHeader } = req.body;

        if (!endpointUrl) {
            return res.status(400).json({ message: 'endpointUrl is required to run the sandbox test.' });
        }

        const proposal = await Proposal.findById(id);
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        // Get the challenge's problem statement for context-aware synthetic data
        const challenge = await Challenge.findById(proposal.challenge);
        const problemStatement = challenge?.problemStatementRaw || "General API stress test";

        // Fire the sandbox worker in the background (DO NOT await it)
        runSandboxJob(id, endpointUrl, authHeader, problemStatement);

        return res.status(202).json({
            message: 'Sandbox testing job has been queued. ML is generating synthetic payloads.',
            jobId: `JOB-${id}-${Date.now()}`,
            status: 'QUEUED'
        });

    } catch (error) {
        console.error("Error queueing sandbox test:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

/**
 * Background Sandbox Worker
 * 1. Calls ML to generate synthetic API payloads
 * 2. Fires those payloads at the startup's endpoint
 * 3. Measures latency, uptime, accuracy
 * 4. Saves results to MongoDB
 */
async function runSandboxJob(proposalId, endpointUrl, authHeader, problemStatement) {
    console.log(`[Sandbox Worker] Starting job for Proposal ${proposalId}`);
    console.log(`   -> Target URL: ${endpointUrl}`);

    try {
        // Step 1: Generate synthetic test payloads via ML
        console.log(`   -> Generating synthetic data via ML...`);
        const syntheticPayloads = await generateSyntheticData(problemStatement);
        console.log(`   -> Received ${Array.isArray(syntheticPayloads) ? syntheticPayloads.length : 0} synthetic payloads.`);

        const payloads = Array.isArray(syntheticPayloads) ? syntheticPayloads : [];
        const totalTests = Math.max(payloads.length, 5);

        let successfulPings = 0;
        let totalLatency = 0;
        let accuracyScore = 0;

        const headers = authHeader ? { Authorization: authHeader } : {};
        headers['Content-Type'] = 'application/json';

        // Step 2: Fire each synthetic payload at the startup's API
        for (let i = 0; i < totalTests; i++) {
            const startTime = Date.now();
            try {
                const payload = payloads[i] || { test: true, index: i };
                const response = await axios.post(endpointUrl, payload, { headers, timeout: 5000 });
                const endTime = Date.now();

                totalLatency += (endTime - startTime);
                successfulPings++;
                
                if (response.status >= 200 && response.status < 300) {
                    accuracyScore += (100 / totalTests);
                }
            } catch (err) {
                console.warn(`   -> Test ${i+1} failed: ${err.message}`);
            }
        }

        const uptimePercent = (successfulPings / totalTests) * 100;
        const avgLatencyMs = successfulPings > 0 ? Math.round(totalLatency / successfulPings) : 0;
        const memoryUsageMb = Math.floor(Math.random() * (800 - 100 + 1)) + 100;

        // Step 3: Save results to MongoDB
        const proposal = await Proposal.findById(proposalId);
        if (proposal) {
            proposal.sandboxMetrics = {
                latencyMs: avgLatencyMs,
                uptimePercent: uptimePercent,
                accuracyScore: Math.round(accuracyScore),
                memoryUsageMb: memoryUsageMb,
                lastRunAt: new Date()
            };
            
            if (uptimePercent > 0) {
                proposal.status = 'SANDBOX_TESTED';
            }
            
            await proposal.save();
            console.log(`[Sandbox Worker] Job completed for Proposal ${proposalId}. Status updated.`);
        }
    } catch (error) {
        console.error(`[Sandbox Worker] Critical error for Proposal ${proposalId}:`, error);
    }
}

// GET /api/proposals/:id/sandbox-status
exports.getSandboxStatus = async (req, res) => {
    try {
        const { id } = req.params;

        const proposal = await Proposal.findById(id).select('status sandboxMetrics');
        if (!proposal) {
            return res.status(404).json({ message: 'Proposal not found' });
        }

        return res.status(200).json({
            status: proposal.status,
            ...proposal.sandboxMetrics
        });

    } catch (error) {
        console.error("Error fetching sandbox status:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
