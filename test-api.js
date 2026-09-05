require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/govinnovatebridge';

async function runTests() {
    try {
        console.log("🚀 Starting Automated API Tests for Phases 2, 3 & 4...\n");

        await mongoose.connect(MONGO_URI);
        const User = require('./src/models/User');
        const Proposal = require('./src/models/Proposal');
        const Challenge = require('./src/models/Challenge');
        const GovernmentProfile = require('./src/models/GovernmentProfile');
        const StartupProfile = require('./src/models/StartupProfile');
        
        console.log("🧹 0. Wiping old data for clean test state...");
        await Proposal.deleteMany({});
        await Challenge.deleteMany({});
        await GovernmentProfile.deleteMany({});
        await StartupProfile.deleteMany({});
        await User.deleteMany({});

        const suffix = Date.now().toString().slice(-5);
        const nodalEmail = `nodal_${suffix}@gov.in`;
        const startupEmail = `ceo_${suffix}@startup.com`;
        const juryEmail = `jury_${suffix}@expert.com`;

        // --- AUTHENTICATION ---
        console.log("📝 1. Registering Users (Nodal, Startup, Jury)...");
        await axios.post(`${BASE_URL}/auth/register`, { name: "Govt Nodal", email: nodalEmail, password: "password123", role: "NODAL_OFFICER", organization: "Dept of Traffic" });
        await axios.post(`${BASE_URL}/auth/register`, { name: "Startup CEO", email: startupEmail, password: "password123", role: "STARTUP_FOUNDER", organization: "AI Startup", dpiitNumber: "DPIIT123456" });
        await axios.post(`${BASE_URL}/auth/register`, { name: "Jury Expert", email: juryEmail, password: "password123", role: "JURY_MEMBER", organization: "IIT Delhi" });

        // Auto verify
        await User.updateMany({ email: { $in: [nodalEmail, startupEmail, juryEmail] } }, { isVerified: true });

        const nodalToken = (await axios.post(`${BASE_URL}/auth/login`, { email: nodalEmail, password: "password123" })).data.token;
        const startupToken = (await axios.post(`${BASE_URL}/auth/login`, { email: startupEmail, password: "password123" })).data.token;
        const juryToken = (await axios.post(`${BASE_URL}/auth/login`, { email: juryEmail, password: "password123" })).data.token;
        
        console.log("✅ All Tokens received.\n");

        // --- PHASE 2: CHALLENGE & PROPOSAL ---
        console.log("📝 2. Nodal Officer creating & publishing Challenge...");
        const challengeRes = await axios.post(`${BASE_URL}/challenges/create`, {
            title: "Smart Traffic System", problemStatementRaw: "We need an AI solution for traffic management.", evaluationDeadline: "2026-12-31T23:59:59Z", pilotBudgetInr: 2000000, departmentName: "Dept of Traffic", category: "AI_ML"
        }, { headers: { Authorization: `Bearer ${nodalToken}` } });
        const challengeId = challengeRes.data.challenge._id;
        await axios.patch(`${BASE_URL}/challenges/${challengeId}/publish`, {}, { headers: { Authorization: `Bearer ${nodalToken}` } });
        console.log(`✅ Challenge Created & Published! ID: ${challengeId}\n`);

        console.log("📝 3. Startup submitting Two-Envelope Proposal...");
        const proposalRes = await axios.post(`${BASE_URL}/proposals/submit`, {
            challengeId: challengeId,
            proposal_metadata: {
                proposal_id: "SAHYOG-PROP-2026-DEL-000913",
                problem_statement_title: "Pothole & Traffic Anomaly Detection using Edge AI"
            },
            pre_requisite_clearance: {
                dpiit_recognition_number: "DIPP123456",
                applicant_entity_type: "DPIIT_RECOGNIZED_STARTUP"
            },
            envelope_a_technical: {
                applicant_display_name: "TrafficSense AI Technologies Pvt. Ltd.",
                executive_approach: "Our solution deploys a fine-tuned YOLOv8n model...",
                system_architecture: [{ layer: "edge_inference", component: "YOLOv8n" }]
            },
            envelope_b_financial: {
                pilot_execution_bid: {
                    amount_inr: 1250000,
                    currency: "INR"
                }
            }
        }, { headers: { Authorization: `Bearer ${startupToken}` } });
        const proposalId = proposalRes.data.proposalId;
        console.log(`✅ Proposal Submitted! ID: ${proposalId}\n`);

        // --- PHASE 3: EVALUATION ---
        console.log("📝 4. Nodal Officer starting Evaluation Phase...");
        await axios.patch(`${BASE_URL}/challenges/${challengeId}/evaluate`, {}, { headers: { Authorization: `Bearer ${nodalToken}` } });
        console.log("✅ Evaluation phase active.\n");

        console.log("📝 5. Jury fetching proposals (Envelope B should be locked)...");
        const fetchRes = await axios.get(`${BASE_URL}/proposals/challenge/${challengeId}`, { headers: { Authorization: `Bearer ${juryToken}` } });
        if (fetchRes.data.proposals[0].envelope_b_financial) {
            throw new Error("SECURITY BREACH: Financial data exposed to Jury!");
        }
        console.log("✅ Security Passed: Financial data is hidden from Jury.\n");

        console.log("📝 6. Jury Evaluating proposal...");
        // First accept the assignment
        await axios.patch(`${BASE_URL}/proposals/${proposalId}/jury/accept`, {}, { headers: { Authorization: `Bearer ${juryToken}` } });
        console.log("✅ Jury Accepted Proposal Assignment.");
        
        const juryEvalRes = await axios.patch(`${BASE_URL}/proposals/${proposalId}/evaluate`, { 
            innovation: 25, feasibility: 18, scalability: 15 
        }, { headers: { Authorization: `Bearer ${juryToken}` } });
        console.log(`✅ Jury Evaluated. Score: ${juryEvalRes.data.scoreCard.totalScore}/70`);

        console.log("📝 6a. Nodal Officer Evaluating proposal...");
        const officerEvalRes = await axios.patch(`${BASE_URL}/proposals/${proposalId}/officer/evaluate`, {
            budgetViability: 12, implementationTimeline: 14
        }, { headers: { Authorization: `Bearer ${nodalToken}` } });
        console.log(`✅ Officer Evaluated. Weighted Final Score: ${officerEvalRes.data.finalWeightedScore.toFixed(2)}/100`);

        console.log("📝 6b. Nodal Officer Shortlisting Top 3...");
        const shortlistRes = await axios.patch(`${BASE_URL}/challenges/${challengeId}/shortlist-top-3`, {}, { headers: { Authorization: `Bearer ${nodalToken}` } });
        console.log(`✅ Shortlisted top ${shortlistRes.data.shortlisted.length} proposals!\n`);

        // --- PHASE 4B: AGREEMENT & ESCROW ---
        console.log("📝 6b. Nodal Officer generating Agreement...");
        const agreementRes = await axios.post(`${BASE_URL}/proposals/${proposalId}/agreement/generate`, {}, { headers: { Authorization: `Bearer ${nodalToken}` } });
        console.log(`✅ Agreement Generated. Hash: ${agreementRes.data.agreementHash}\n`);

        console.log("📝 6c. Startup signing Agreement (Triggers Escrow Freeze)...");
        const signRes = await axios.patch(`${BASE_URL}/proposals/${proposalId}/agreement/sign`, {}, { headers: { Authorization: `Bearer ${startupToken}` } });
        console.log(`✅ Agreement Signed! Escrow Status: ${signRes.data.escrowStatus}\n`);

        // --- PHASE 4: SANDBOX ---
        console.log("📝 7. Nodal Officer starting Sandbox Phase...");
        await axios.patch(`${BASE_URL}/challenges/${challengeId}/sandbox`, {}, { headers: { Authorization: `Bearer ${nodalToken}` } });
        console.log("✅ Sandbox phase active.\n");

        console.log("📝 8. Startup running Sandbox Simulation...");
        const sandboxRes = await axios.post(`${BASE_URL}/proposals/${proposalId}/sandbox-run`, {}, { headers: { Authorization: `Bearer ${startupToken}` } });
        console.log("✅ Sandbox Run Complete. Metrics: ", sandboxRes.data.metrics);
        console.log("\n");

        console.log("📝 9. Nodal Officer awarding Grant...");
        await axios.patch(`${BASE_URL}/proposals/${proposalId}/award`, {}, { headers: { Authorization: `Bearer ${nodalToken}` } });
        console.log("✅ Grant AWARDED successfully!\n");

        console.log("🎉 ALL TESTS PASSED SUCCESSFULLY! Phases 2, 3, 4, and 4B are working perfectly.");

    } catch (error) {
        console.error("❌ Test Failed:", error.response ? error.response.data : error.message);
    } finally {
        await mongoose.disconnect();
    }
}

runTests();
