const Challenge = require('../models/Challenge');
const Proposal = require('../models/Proposal');
const { semanticTriage } = require('../services/mlFiltrationService');

// GET /api/challenges/:id/matches
// Uses ML Semantic Triage to rank proposals by similarity to the Problem Statement
exports.getMatches = async (req, res) => {
    try {
        const { id } = req.params;
        const limit = parseInt(req.query.limit) || 10;

        const challenge = await Challenge.findById(id);
        if (!challenge) {
            return res.status(404).json({ message: 'Challenge not found' });
        }

        // Fetch all proposals for this challenge
        const proposals = await Proposal.find({ challenge: id }).populate('submittedBy', 'name');

        if (!proposals || proposals.length === 0) {
            return res.status(200).json({ matches: [] });
        }

        // Build the payload for ML semantic triage
        const proposalPayloads = proposals.map(p => ({
            id: p._id.toString(),
            text: p.envelope_a_technical?.piiRedactedText || p.envelope_a_technical?.startup_pitch || JSON.stringify(p.envelope_a_technical)
        }));

        // ML Call: Semantic Triage using text-embedding-004 + Cosine Similarity
        const mlResponse = await semanticTriage(challenge.problemStatementRaw, proposalPayloads);

        // Map ML results back to proposal metadata
        const rankedMatches = (mlResponse?.matches || []).slice(0, limit).map(match => {
            const proposal = proposals.find(p => p._id.toString() === match.id);
            return {
                proposalId: match.id,
                founderName: proposal?.submittedBy?.name || 'Unknown',
                submissionRef: proposal?.submissionRefNumber || 'N/A',
                matchScore: match.score,
                verifiedTrl: proposal?.verified_trl_score || 0
            };
        });

        res.status(200).json({
            challengeTitle: challenge.title,
            totalProposals: proposals.length,
            matchedAboveThreshold: rankedMatches.length,
            matches: rankedMatches,
            _fallback: mlResponse?._fallback || false
        });
    } catch (error) {
        console.error("Error in matchmaking:", error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
