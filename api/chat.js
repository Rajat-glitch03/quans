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

        // 4. Securely dispatch the prompt payload to Google Gemini API (Multimodal Endpoint Layer)
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                contents: contents,
                // CREDIT SAVER SYSTEM DIRECTIVE: Enforces compact token answers dynamically
                systemInstruction: {
                    parts: [{ text: "You are an extremely concise assistant. Provide answers using the bare minimum length needed to be accurate and helpful. Use brief lists and short sentences. Stay under 45 words whenever possible to conserve token limits." }]
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
