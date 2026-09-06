const mongoose = require('mongoose');
require('dotenv').config();
const Challenge = require('./src/models/Challenge');
const User = require('./src/models/User');

const officialMaharashtraChallenges = [
    {
        title: "Use of AI in Governance",
        description: "Maharashtra handles vast administrative functions across 36 districts. AI can help optimize resource allocation, automate processes, and improve transparency across Aaple Sarkar, MahaDBT, and land record portals.",
        problemStatementRaw: "Maharashtra handles vast administrative functions across 36 districts. AI can help optimize resource allocation, automate processes, and improve transparency across Aaple Sarkar, MahaDBT, and land record portals.",
        department: "General Administration & IT Department, Govt. of Maharashtra",
        category: "Artificial Intelligence in Governance",
        evaluationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "PUBLISHED",
        budgetAllocation: 2000000,
        subProblems: [
            "AI-powered chatbots for Aaple Sarkar (RTS, Grievance) and citizen portals",
            "AI-based fraud detection for leakages in MahaDBT and subsidy schemes",
            "Predictive analytics for disaster response, water management, and urban planning",
            "AI for grievance redressal: NLP-based automation to classify and prioritize complaints",
            "Automated document verification for land records (MahaBhoomi) and property registrations"
        ]
    },
    {
        title: "Use of Drones in Disaster Management",
        description: "Maharashtra is prone to floods, droughts, industrial fires, and landslides. Drones provide real-time surveillance, rapid damage assessment, and emergency aid delivery integrated with SDRF.",
        problemStatementRaw: "Maharashtra is prone to floods, droughts, industrial fires, and landslides. Drones provide real-time surveillance, rapid damage assessment, and emergency aid delivery integrated with SDRF.",
        department: "Disaster Management Authority, Government of Maharashtra",
        category: "Drones & Disaster Management",
        evaluationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "PUBLISHED",
        budgetAllocation: 2500000,
        subProblems: [
            "Drone-based flood monitoring and real-time alerts in regional languages using Bhashini",
            "Drones for crop damage assessment to expedite compensation under PMFBY",
            "Autonomous drones for search & rescue operations in landslide-prone areas",
            "Thermal-imaging drones for fire and industrial hazard monitoring (MIDC industrial areas)",
            "Drone-assisted surveillance during mass gatherings (Kumbh Mela, Pandharpur Wari)"
        ]
    },
    {
        title: "Anti-Drone Technology",
        description: "Key urban and security zones (Mumbai, Pune, Nagpur, Nashik) are vulnerable to unauthorized drone activities. The state must adopt anti-drone solutions for critical security infrastructure and public events.",
        problemStatementRaw: "Key urban and security zones (Mumbai, Pune, Nagpur, Nashik) are vulnerable to unauthorized drone activities. The state must adopt anti-drone solutions for critical security infrastructure and public events.",
        department: "Maharashtra Police & Cyber Crime Division",
        category: "Defense & Security Technology",
        evaluationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "PUBLISHED",
        budgetAllocation: 3000000,
        subProblems: [
            "AI-driven drone detection & classification system for high-security areas (Mantralaya, BARC, DRDO)",
            "RF-based drone tracking and jamming around Mumbai, Pune, and Nagpur airports",
            "Anti-drone solutions for large public events (Ganpati Visarjan, IPL matches, political rallies)",
            "Autonomous interception drones to neutralize rogue UAVs in real-time",
            "Integration of anti-drone systems with Maharashtra's Cyber Crime & Law Enforcement Networks"
        ]
    },
    {
        title: "Live Speech Translation using Bhashini",
        description: "Maharashtra is linguistically diverse (Marathi, Hindi, Urdu, Gujarati, tribal dialects). Government communication is limited, creating barriers. Integrating Bhashini AI improves accessibility across demographics.",
        problemStatementRaw: "Maharashtra is linguistically diverse (Marathi, Hindi, Urdu, Gujarati, tribal dialects). Government communication is limited, creating barriers. Integrating Bhashini AI improves accessibility across demographics.",
        department: "Digital India Bhashini Division & Maharashtra IT Dept",
        category: "Multilingual AI & Translation",
        evaluationDeadline: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        status: "PUBLISHED",
        budgetAllocation: 1500000,
        subProblems: [
            "Real-time Marathi to English, Hindi, Urdu, and tribal language translations in meetings",
            "Live translation for helpline services (CM Helpline, Women Helpline, Aaple Sarkar)",
            "Automatic translation of legal proceedings and FIRs to help non-Marathi speakers",
            "Integration of speech translation into education portals (MahaDBT scholarship, e-learning)",
            "Bhashini-powered live subtitles for Maharashtra government speeches and press briefings"
        ]
    }
];

async function seedBhashiniChallenges() {
    try {
        await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/sahyog');
        console.log("📦 Connected to MongoDB for 3-day window challenge seeding...");

        let officer = await User.findOne({ role: { $in: ['NODAL_OFFICER', 'ADMIN'] } });
        if (!officer) {
            officer = await User.findOne({});
        }

        if (!officer) {
            console.error("❌ No user/officer found in database. Please register an account first.");
            process.exit(1);
        }

        const challengesToInsert = officialMaharashtraChallenges.map(c => ({
            ...c,
            createdBy: officer._id
        }));

        await Challenge.deleteMany({});
        await Challenge.insertMany(challengesToInsert);

        console.log("✅ Successfully seeded challenges with problemStatementRaw and a strict 3-day window!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Seeding failed:", err);
        process.exit(1);
    }
}

seedBhashiniChallenges();