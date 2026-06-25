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
        // Change from { message } to accepting the full structured contents array
        const { contents } = req.body;

        if (!contents || !Array.isArray(contents)) {
            return res.status(400).json({ error: 'Missing or invalid contents array parameter.' });
        }

        // 3. Extract the secret key securely from Vercel's backend ecosystem
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Deployment Error: GEMINI_API_KEY is not defined in Vercel Environment Variables.");
            return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
        }

        // 4. Securely dispatch the prompt payload to Google Gemini API
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                contents: contents,
                // CRITICAL CREDIT SAVER: Instructs the model to stay extremely brief at the system level
                systemInstruction: {
                    parts: [{ text: "You are a highly concise AI. Answer all prompts with the absolute minimum required length to be helpful. Keep explanations brief, use bullet points, and aim for under 50 words whenever possible to save tokens." }]
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
        
        // 5. Send the structured payload right back to your front-end
        return res.status(200).json(data);

    } catch (error) {
        console.error("Vercel Serverless Function Catch-All Error:", error);
        return res.status(500).json({ error: 'Internal Server Error processing your chat generation request.' });
    }
}
