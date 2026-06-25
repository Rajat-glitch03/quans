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
                        text: `You are QUANS, an advanced AI assistant operating smoothly in real-time. 
        
CRITICAL OPERATIONAL DIRECTIVES:
1. TEMPORAL ANCHOR (Live Time Awareness): Today's actual current date is ${currentLiveDate}. You live in the present year 2026. Use this exact calendar date to confidently interpret relative time expressions like "yesterday", "today", "current", or "this week".

2. REAL-TIME TASKS & SPORTS: If a user asks about dynamic topics, real-time sports updates, or news (e.g., recent matches or live scores), provide the most accurate details available within your internal knowledge limits. Since you do not have external live tools active, do not say you don't know the date—instead, respond helpfully based on the 2026 timeline.

3. COMPACT BLOCKS: Keep answers informative but highly concise. Use short sentences and clean bullet points. Eliminate conversational filler.

4. MANDATORY DISCLAIMER NOTE: At the very end of your response, if you are answering questions about real-time events, sports, or live news, you MUST append this exact notice text line on a separate newline paragraph paragraph format exactly:
*Note: If AI responses are not correct then visit google.*`
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
