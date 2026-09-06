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

        // Fire the worker in the background (DO NOT await it)
        runSandboxJob(id, endpointUrl, authHeader);

        return res.status(202).json({
            message: 'Sandbox testing job has been queued.',
            jobId: `JOB-${id}-${Date.now()}`,
            status: 'QUEUED'
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
