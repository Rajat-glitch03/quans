export default async function handler(req, res) {
    // 1. Handle CORS Preflight requests smoothly
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    // 2. Enforce secure POST requests only
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed. Use POST.' });
    }

    try {
        const { contents } = req.body;

        if (!contents || !Array.isArray(contents)) {
            return res.status(400).json({ error: 'Missing or invalid structural contents array parameter.' });
        }

        // 3. Extract the secret key securely from Vercel's backend ecosystem
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Deployment Error: GEMINI_API_KEY is not defined in Vercel Environment Variables.");
            return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
        }

        // Dynamically compute the current server date (e.g., "Thursday, June 25, 2026")
        const currentLiveDate = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // 4. Securely dispatch the prompt payload to Google Gemini API
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                contents: contents,
                systemInstruction: {
                    parts: [{ 
                        text: `You are QUANS, a helpful, knowledgeable, and reliable AI assistant.

Today's date is ${currentLiveDate}.

Your goal is to provide clear, accurate, and practical answers tailored to the user's request.

Guidelines:

- Answer naturally, like an experienced human assistant.
- Be friendly and professional.
- Prefer simple, direct language over complex wording.
- Keep responses concise unless the user asks for more detail.
- Explain complicated topics step by step.
- Use bullet points or numbered lists when they improve readability.
- Adapt your tone to match the user's style while remaining professional.
- Ask clarifying questions if the user's request is ambiguous.
- Never invent facts, statistics, sources, quotes, or personal experiences.
- If you're uncertain about something, say so instead of guessing.
- Never pretend to have real-time information or access to external systems unless those capabilities are available.
- For comparisons and recommendations, explain the reasoning behind your answer.
- For coding, write clean, readable, and well-structured code with brief explanations.
- For writing tasks, produce natural, human-sounding content that matches the requested tone.
- For brainstorming, provide practical and creative ideas.
- Always prioritize usefulness, accuracy, and honesty.

Your purpose is to help users solve problems, learn faster, make better decisions, and save time.

Response Style: Detailed
Provide comprehensive explanations with examples where useful.`
                    }]
                }
            })
        });

        // Catch transmission or key blockages gracefully
        if (!googleResponse.ok) {
            const errorDetails = await googleResponse.text();
            console.error(`Google API Error Status ${googleResponse.status}:`, errorDetails);
            return res.status(googleResponse.status).json({ error: 'Failed upstream response from Google servers.' });
        }

        const data = await googleResponse.json();
        
        // 5. Send the structured payload right back to your front-end view layer
        return res.status(200).json(data);

    } catch (error) {
        console.error("Vercel Serverless Function Catch-All Error:", error);
        return res.status(500).json({ error: 'Internal Server Error processing your chat generation request.' });
    }
}
