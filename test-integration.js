require('dotenv').config();
const mlTrlService = require('./src/services/mlTrlService');
const mlFiltrationService = require('./src/services/mlFiltrationService');

async function testIntegration() {
    console.log("=== Testing Backend <-> ML Bridge ===\n");
    
    try {
        console.log("1. Testing ML Semantic Triage (Matchmaking)...");
        const triageRes = await mlFiltrationService.semanticTriage(
            "We need a drone-based AI solution for pothole detection on highways.",
            [
                { id: "prop1", text: "We build autonomous AI drones specifically for road and infrastructure inspection using computer vision." },
                { id: "prop2", text: "We manufacture commercial baking equipment for making large batches of cupcakes." }
            ]
        );
        console.log("   Result:", JSON.stringify(triageRes, null, 2));

        console.log("\n------------------------------------------------\n");

        console.log("2. Testing TRL Question Generation...");
        const questionsRes = await mlTrlService.generateQuestions("AI pothole detector using YOLOv8", 5);
        console.log("   Result:", JSON.stringify(questionsRes, null, 2));

        console.log("\n------------------------------------------------\n");

        console.log("3. Testing PII Redaction...");
        const redactRes = await mlFiltrationService.redactProposal("Our founder is John Doe. You can reach him at john.doe@example.com or call 9876543210.");
        console.log("   Result:", JSON.stringify(redactRes, null, 2));

        console.log("\n=== Integration Test Complete ===");
    } catch (error) {
        console.error("Test failed!", error.message);
    }
}

testIntegration();
