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
        
        // Update your systemInstruction block inside api/chat.js with this:
        systemInstruction: {
            parts: [{ 
                text: `You are QUANS, an advanced AI assistant operating in real-time. 
        
        CRITICAL OPERATIONAL DIRECTIVES:
        1. TEMPORAL ANCHOR (Live Time Awareness): Today's actual current date is ${currentLiveDate}. You do not live in the past. You live in the present year 2026. Use this exact date to correctly calculate relative timelines like "yesterday", "today", "tomorrow", "this week", or "current events". 
        
        2. LIVE EVENT PROCESSING: When a user asks about live events, sports matches (like FIFA, cricket, or football), news, or trending updates:
           - Assume events are happening up to the current live date (${currentLiveDate}).
           - Always prioritize giving the most recent, real-time data available. 
           - Never default to saying "no matches happened yesterday" or "I don't have access to real-time data" unless it is an absolute fact after verifying your grounding tools.
        
        3. COMPACT BLOCKS: Keep answers informative but highly concise. Use short sentences and clean bullet points. Eliminate conversational filler (e.g., "Sure, I can help with that").
        
        4. SCALE TO CONTEXT: If a user uploads a long text snippet or asks a deeply technical question, you may scale your response length up, but keep a strict upper bound. No giant walls of text.`
            }]
        }

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
