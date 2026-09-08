const axios = require('axios');

exports.chatWithAssistant = async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        // Forward to Python ML service
        const pythonResponse = await axios.post('http://localhost:8000/assistant/chat', {
            message
        });

        return res.status(200).json({
            response: pythonResponse.data.response
        });

    } catch (error) {
        console.error("AI Assistant Error:", error.message);
        return res.status(500).json({ error: "Failed to communicate with AI Assistant" });
    }
};
