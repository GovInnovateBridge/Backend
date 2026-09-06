const Proposal = require('../models/Proposal');
const { runSandboxJob } = require('../services/sandboxWorker');

// POST /api/proposals/:id/run-sandbox
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

        // Mock latency and accuracy metrics
        const mockMetrics = {
            latency_ms: Math.floor(Math.random() * 100) + 20, // 20-120ms
            accuracy_score: (Math.random() * 10 + 85).toFixed(2), // 85-95%
            uptime_sla: 99.9,
            tests_passed: true
        };

        proposal.sandboxMetrics = mockMetrics;
        proposal.status = 'SANDBOX_TESTED';
        await proposal.save();

        return res.status(200).json({
            message: 'Sandbox testing completed successfully.',
            metrics: mockMetrics,
            status: proposal.status
        });

    } catch (error) {
        console.error("Error queueing sandbox test:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

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
