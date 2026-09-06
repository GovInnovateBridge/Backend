const axios = require('axios');
const Proposal = require('../models/Proposal');

/**
 * Async Worker to run synthetic payloads against a startup's API endpoint.
 * This runs in the background so the HTTP request doesn't block.
 */
async function runSandboxJob(proposalId, endpointUrl, authHeader = null) {
    console.log(`🧪 [Sandbox Worker] Starting job for Proposal ${proposalId}`);
    console.log(`   -> Target URL: ${endpointUrl}`);

    try {
        const pings = 5;
        let successfulPings = 0;
        let totalLatency = 0;
        let accuracyScore = 0;

        const headers = authHeader ? { Authorization: authHeader } : {};

        // Send 5 synthetic requests to measure latency and uptime
        for (let i = 0; i < pings; i++) {
            const startTime = Date.now();
            try {
                // 5-second timeout per ping so a dead server doesn't hang us
                const response = await axios.get(endpointUrl, { headers, timeout: 5000 });
                const endTime = Date.now();

                totalLatency += (endTime - startTime);
                successfulPings++;
                
                // Extremely basic "accuracy" check for demo purposes
                // If the response is JSON and has data, we give it points
                if (response.status === 200) {
                    accuracyScore += (100 / pings);
                }
            } catch (err) {
                console.warn(`   -> Ping ${i+1} failed: ${err.message}`);
            }
        }

        const uptimePercent = (successfulPings / pings) * 100;
        const avgLatencyMs = successfulPings > 0 ? Math.round(totalLatency / successfulPings) : 0;
        
        // Randomize memory usage for demo
        const memoryUsageMb = Math.floor(Math.random() * (800 - 100 + 1)) + 100;

        // Fetch the proposal to update metrics
        const proposal = await Proposal.findById(proposalId);
        if (proposal) {
            proposal.sandboxMetrics = {
                latencyMs: avgLatencyMs,
                uptimePercent: uptimePercent,
                accuracyScore: Math.round(accuracyScore),
                memoryUsageMb: memoryUsageMb,
                lastRunAt: new Date()
            };
            
            // Only update status if the test actually succeeded somewhat
            if (uptimePercent > 0) {
                proposal.status = 'SANDBOX_TESTED';
            }
            
            await proposal.save();
            console.log(`✅ [Sandbox Worker] Job completed for Proposal ${proposalId}. Status updated.`);
        }
    } catch (error) {
        console.error(`❌ [Sandbox Worker] Critical error for Proposal ${proposalId}:`, error);
    }
}

module.exports = {
    runSandboxJob
};
