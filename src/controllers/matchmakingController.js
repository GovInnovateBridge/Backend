const Challenge = require('../models/Challenge');
const Proposal = require('../models/Proposal');
const { vectorSearch } = require('../services/mlClient');

// GET /api/challenges/:id/matches
exports.getMatches = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const challenge = await Challenge.findById(id);
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        // Fetch all proposals for this challenge
        // We do NOT fetch envelope_b_financial here to respect vault security.
        const proposals = await Proposal.find({ challenge: id }).populate('submittedBy', 'name');

        if (!proposals || proposals.length === 0) {
            return res.status(200).json({ matches: [] });
        }

        const candidateVectors = proposals.map(p => ({
            proposalId: p._id.toString(),
            vector: p.envelope_a_technical?.kpiVector || [],
            founderName: p.submittedBy?.name || 'Unknown'
        }));

        const challengeKpiVector = challenge.extractedKPIs?.kpiVector || [];

        // ML Call: Vector Search
        const mlResponse = await vectorSearch(challengeKpiVector, candidateVectors);

        // Enhance ML response with founder names
        const rankedMatches = (mlResponse?.ranked || []).slice(0, limit).map(r => {
            const candidate = candidateVectors.find(c => c.proposalId === r.proposalId);
            return {
                proposalId: r.proposalId,
                founderName: candidate ? candidate.founderName : 'Unknown',
                matchScore: r.matchScore
            };
        });

        res.status(200).json({ matches: rankedMatches });
    } catch (error) {
        console.error("Error in matchmaking:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
