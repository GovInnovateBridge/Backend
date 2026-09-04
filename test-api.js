require('dotenv').config();
const axios = require('axios');
const mongoose = require('mongoose');

const BASE_URL = 'http://localhost:5000/api';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/govinnovatebridge';

async function runTests() {
    try {
        console.log("🚀 Starting Automated API Tests for Phase 2...\n");

        // Connect to DB directly to verify test users automatically
        await mongoose.connect(MONGO_URI);
        const User = require('./src/models/User');

        // 1. Register Nodal Officer
        console.log("📝 1. Registering Nodal Officer...");
        await axios.post(`${BASE_URL}/auth/register`, {
            name: "Govt Nodal", email: "nodal4@gov.in", password: "password123", role: "NODAL_OFFICER"
        }).catch(() => {}); // Ignore error if already registered

        // Force verify user in DB for testing
        await User.updateOne({ email: "nodal4@gov.in" }, { isVerified: true });

        const nodalLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: "nodal4@gov.in", password: "password123"
        });
        const nodalToken = nodalLogin.data.token;
        console.log("✅ Nodal Officer Logged In. Token received.\n");

        // 2. Create Challenge
        console.log("📝 2. Nodal Officer creating a Challenge...");
        const challengeRes = await axios.post(`${BASE_URL}/challenges/create`, {
            title: "Smart Traffic System",
            problemStatementRaw: "We need an AI solution for traffic management.",
            evaluationDeadline: "2026-12-31T23:59:59Z",
            pilotBudgetInr: 2000000,
            departmentName: "Dept of Traffic",
            category: "AI_ML"
        }, { headers: { Authorization: `Bearer ${nodalToken}` } });
        const challengeId = challengeRes.data.challenge._id;
        console.log(`✅ Challenge Created! ID: ${challengeId} (Status: DRAFT)\n`);

        // 3. Publish Challenge
        console.log("📝 3. Publishing the Challenge...");
        await axios.patch(`${BASE_URL}/challenges/${challengeId}/publish`, {}, {
            headers: { Authorization: `Bearer ${nodalToken}` }
        });
        console.log("✅ Challenge Published successfully!\n");

        // 4. Register and Login Startup Founder
        console.log("📝 4. Registering Startup Founder...");
        await axios.post(`${BASE_URL}/auth/register`, {
            name: "Startup CEO", email: "ceo4@startup.com", password: "password123", role: "STARTUP_FOUNDER"
        }).catch(() => {});

        // Force verify user in DB for testing
        await User.updateOne({ email: "ceo4@startup.com" }, { isVerified: true });

        const startupLogin = await axios.post(`${BASE_URL}/auth/login`, {
            email: "ceo4@startup.com", password: "password123"
        });
        const startupToken = startupLogin.data.token;
        console.log("✅ Startup Logged In. Token received.\n");

        // 5. Submit Two-Envelope Proposal
        console.log("📝 5. Startup submitting Two-Envelope Proposal...");
        const proposalRes = await axios.post(`${BASE_URL}/proposals/submit`, {
            challengeId: challengeId,
            dpiitNumber: "DPIIT12345",
            startupName: "AI Solutions Pvt Ltd",
            executiveSummary: "Our solution uses YOLOv8.",
            techStack: ["YOLOv8", "Python", "Node.js"],
            technicalArchitecture: "CCTV -> Edge Node -> Cloud",
            rawText: "AI Solutions founder contact is ceo4@startup.com",
            trialBudgetInr: 500000,
            commercialUnitBudgetInr: 100000,
            totalGrantRequestedInr: 2000000,
            milestones: [
                { milestoneCode: "M1", paymentPercentage: 40, amountInr: 800000, deliverableTarget: "Pilot" }
            ]
        }, { headers: { Authorization: `Bearer ${startupToken}` } });

        console.log("✅ Proposal Submitted Successfully!");
        console.log("Response Details:", proposalRes.data);
        console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY! Phase 2 is working perfectly.");

    } catch (error) {
        console.error("❌ Test Failed:", error.response ? error.response.data : error.message);
    } finally {
        await mongoose.disconnect();
    }
}

runTests();
