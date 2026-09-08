const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Models
const User = require('./models/User');
const Challenge = require('./models/Challenge');
const Proposal = require('./models/Proposal');
const StartupProfile = require('./models/StartupProfile');
const GovernmentProfile = require('./models/GovernmentProfile');
const Escrow = require('./models/Escrow');

const { getMockDpiitData } = require('./controllers/mockGatewayController');

// Dummy Users Configuration
const passwordHash = bcrypt.hashSync('Password@123', 10);

async function seedDatabase() {
    try {
        console.log("⏳ Connecting to Database...");
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sahyog');
        console.log("✅ Connected.");

        // ==========================================
        // 1. WIPE DATABASE
        // ==========================================
        console.log("🧹 Wiping existing data...");
        await User.deleteMany({});
        await Challenge.deleteMany({});
        await Proposal.deleteMany({});
        await StartupProfile.deleteMany({});
        await GovernmentProfile.deleteMany({});
        await Escrow.deleteMany({});

        // ==========================================
        // 2. CREATE NODAL OFFICER & JURIES
        // ==========================================
        console.log("👤 Creating Nodal Officer and Jury Members...");

        const nodalOfficer = await User.create({
            name: "Rajesh Patil",
            email: "rajesh.patil@gov.in",
            password: passwordHash,
            role: "NODAL_OFFICER",
            isVerified: true
        });
        await GovernmentProfile.create({ user: nodalOfficer._id, departmentName: "Maharashtra IT Dept", designation: "Joint Secretary" });

        const juries = await User.insertMany([
            { name: "Dr. Anil Sharma", email: "anil.sharma@gov.in", password: passwordHash, role: "JURY_MEMBER", isVerified: true },
            { name: "Priya Desai", email: "priya.desai@gov.in", password: passwordHash, role: "JURY_MEMBER", isVerified: true },
            { name: "Rahul Verma", email: "rahul.verma@gov.in", password: passwordHash, role: "JURY_MEMBER", isVerified: true }
        ]);

        for (const jury of juries) {
            await GovernmentProfile.create({ user: jury._id, departmentName: "Technical Evaluation Board", designation: "Senior Scientist" });
        }

        // ==========================================
        // 3. CREATE STARTUPS
        // ==========================================
        console.log("🚀 Creating 5 Startup Founders...");

        const startupUsers = [];
        for (let i = 1; i <= 5; i++) {
            const user = await User.create({
                name: `Founder ${i}`,
                email: `founder${i}@startup.com`,
                password: passwordHash,
                role: "STARTUP_FOUNDER",
                isVerified: true,
                kpiVector: [Math.random(), Math.random(), Math.random()]
            });
            startupUsers.push(user);

            const mockDPIIT = getMockDpiitData(`DIPP${1000 + i}`);
            await StartupProfile.create({
                user: user._id,
                companyName: mockDPIIT.data.entity_details.legal_entity_name.replace('TrafficSense', `Startup${i}`),
                dpiitNumber: mockDPIIT.data.dpiit_recognition_number,
                dpiitDetails: mockDPIIT.data
            });
        }

        // ==========================================
        // 4. CREATE CHALLENGES (4 Different States)
        // ==========================================
        console.log("🏆 Creating Challenges in different states...");

        const challenges = await Challenge.insertMany([
            {
                title: "[PUBLISHED] Use of AI in Governance",
                description: "Maharashtra handles vast administrative functions across 36 districts. AI can help optimize resource allocation, automate processes, and improve transparency across Aaple Sarkar, MahaDBT, and land record portals.",
                problemStatementRaw: "Maharashtra handles vast administrative functions across 36 districts. AI can help optimize resource allocation, automate processes, and improve transparency across Aaple Sarkar, MahaDBT, and land record portals.",
                department: "General Administration & IT Department, Govt. of Maharashtra",
                category: "Artificial Intelligence in Governance",
                createdBy: nodalOfficer._id,
                evaluationDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
                status: "PUBLISHED",
                budgetAllocation: 2000000,
                kpiVector: [0.9, 0.8, 0.2]
            },
            {
                title: "[EVALUATING] Use of Drones in Disaster Management",
                description: "Maharashtra is prone to floods, droughts, industrial fires, and landslides. Drones provide real-time surveillance, rapid damage assessment, and emergency aid delivery integrated with SDRF.",
                problemStatementRaw: "Maharashtra is prone to floods, droughts, industrial fires, and landslides. Drones provide real-time surveillance, rapid damage assessment, and emergency aid delivery integrated with SDRF.",
                department: "Disaster Management Authority, Government of Maharashtra",
                category: "Drones & Disaster Management",
                createdBy: nodalOfficer._id,
                evaluationDeadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                status: "EVALUATING",
                budgetAllocation: 2500000,
                kpiVector: [0.1, 0.9, 0.4]
            },
            {
                title: "[SANDBOX_ACTIVE] Anti-Drone Technology",
                description: "Key urban and security zones (Mumbai, Pune, Nagpur, Nashik) are vulnerable to unauthorized drone activities. The state must adopt anti-drone solutions for critical security infrastructure and public events.",
                problemStatementRaw: "Key urban and security zones (Mumbai, Pune, Nagpur, Nashik) are vulnerable to unauthorized drone activities. The state must adopt anti-drone solutions for critical security infrastructure and public events.",
                department: "Maharashtra Police & Cyber Crime Division",
                category: "Defense & Security Technology",
                createdBy: nodalOfficer._id,
                evaluationDeadline: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                status: "SANDBOX_ACTIVE",
                budgetAllocation: 3000000,
                kpiVector: [0.2, 0.3, 0.9]
            },
            {
                title: "[CLOSED] Live Speech Translation using Bhashini",
                description: "Maharashtra is linguistically diverse. Government communication is limited, creating barriers. Integrating Bhashini AI improves accessibility across demographics.",
                problemStatementRaw: "Maharashtra is linguistically diverse. Government communication is limited, creating barriers. Integrating Bhashini AI improves accessibility across demographics.",
                department: "Digital India Bhashini Division & Maharashtra IT Dept",
                category: "Multilingual AI & Translation",
                createdBy: nodalOfficer._id,
                evaluationDeadline: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                status: "CLOSED",
                budgetAllocation: 1500000,
                kpiVector: [0.8, 0.1, 0.7]
            }
        ]);

        // ==========================================
        // 5. CREATE PROPOSALS & ESCROWS
        // ==========================================
        console.log("📄 Generating Proposals and Smart Escrows...");

        // For PUBLISHED Challenge -> 3 SUBMITTED Proposals
        for (let i = 0; i < 3; i++) {
            await Proposal.create({
                challenge: challenges[0]._id,
                submittedBy: startupUsers[i]._id,
                submissionRefNumber: `PROP-PUB-${1000 + i}`,
                envelope_a_technical: { solution: "AI Chatbots for Aaple Sarkar", applicant_display_name: `Startup${i + 1}` },
                envelope_b_financial: { pilot_execution_bid: { amount_inr: 2000000 } },
                status: "SUBMITTED"
            });
        }

        // For EVALUATING Challenge -> 3 JURY_EVALUATED Proposals
        for (let i = 0; i < 3; i++) {
            await Proposal.create({
                challenge: challenges[1]._id,
                submittedBy: startupUsers[i + 1]._id,
                submissionRefNumber: `PROP-EVAL-${1000 + i}`,
                envelope_a_technical: { solution: "Drone-based Flood Monitoring", applicant_display_name: `Startup${i + 2}` },
                envelope_b_financial: { pilot_execution_bid: { amount_inr: 4500000 } },
                status: "JURY_EVALUATED",
                assignedJury: juries[0]._id,
                juryScoreCard: { totalScore: 60 + i },
                juryTimeline: { m1Days: 30, m2Days: 45, m3Days: 15 }
            });
        }

        // For SANDBOX_ACTIVE Challenge -> 3 SHORTLISTED Proposals with ESCROWS
        for (let i = 0; i < 3; i++) {
            const proposal = await Proposal.create({
                challenge: challenges[2]._id,
                submittedBy: startupUsers[i]._id,
                submissionRefNumber: `PROP-SANDBOX-${1000 + i}`,
                envelope_a_technical: { solution: "RF-based Jamming & Tracking System", applicant_display_name: `Startup${i + 1}` },
                envelope_b_financial: { pilot_execution_bid: { amount_inr: 8000000 } },
                status: "SHORTLISTED",
                assignedJury: juries[1]._id,
                juryScoreCard: { totalScore: 65 },
                officerScoreCard: { totalScore: 28 },
                finalWeightedScore: 88 + i,
                agreementStatus: "SIGNED",
                escrowStatus: "FROZEN",
                juryTimeline: { m1Days: 20, m2Days: 20, m3Days: 20 }
            });

            // Initialize 15-35-50 Escrow
            const totalBudget = proposal.envelope_b_financial.pilot_execution_bid.amount_inr;
            await Escrow.create({
                proposal: proposal._id,
                challenge: proposal.challenge,
                milestones: [
                    { code: "M1", amount: totalBudget * 0.15, status: "PENDING" },
                    { code: "M2", amount: totalBudget * 0.35, status: "PENDING" },
                    { code: "M3", amount: totalBudget * 0.50, status: "PENDING" }
                ]
            });
        }

        // For CLOSED Challenge -> 1 AWARDED Proposal
        const awardedProposal = await Proposal.create({
            challenge: challenges[3]._id,
            submittedBy: startupUsers[4]._id,
            submissionRefNumber: `PROP-CLOSED-9999`,
            envelope_a_technical: { solution: "NLP Bhashini", applicant_display_name: `Startup5` },
            envelope_b_financial: { pilot_execution_bid: { amount_inr: 1400000 } },
            status: "AWARDED",
            assignedJury: juries[2]._id,
            juryScoreCard: { totalScore: 68 },
            officerScoreCard: { totalScore: 29 },
            finalWeightedScore: 95,
            agreementStatus: "SIGNED",
            escrowStatus: "RELEASED",
            sandboxMetrics: { latencyMs: 45, uptimePercent: 99.99, accuracyScore: 98, lastRunAt: new Date() }
        });

        // Awarded Escrow
        await Escrow.create({
            proposal: awardedProposal._id,
            challenge: awardedProposal.challenge,
            milestones: [
                { code: "M1", amount: 1400000 * 0.15, status: "RELEASED" },
                { code: "M2", amount: 1400000 * 0.35, status: "RELEASED" },
                { code: "M3", amount: 1400000 * 0.50, status: "RELEASED" }
            ]
        });

        console.log("=========================================");
        console.log("🎉 SEEDING COMPLETE!");
        console.log("=========================================");
        console.log("Test Login Credentials (Password is Password@123 for all):");
        console.log(" - Nodal Officer: rajesh.patil@gov.in");
        console.log(" - Jury Member: anil.sharma@gov.in");
        console.log(" - Startup Founder: founder1@startup.com (up to founder5)");

        process.exit(0);

    } catch (error) {
        console.error("❌ Error during seeding:", error);
        process.exit(1);
    }
}

seedDatabase();
