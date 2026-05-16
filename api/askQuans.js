export default async function handler(req, res) {
    // 1. Only allow POST requests for security
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Protocol rejected.' });
    }

    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is missing.' });
    }

    try {
        // 2. Read the hidden API key directly from Vercel's environment variables
        const apiKey = process.env.GEMINI_API_KEY;
        
        if (!apiKey) {
            return res.status(500).json({ error: 'API Key missing in Vercel settings.' });
        }

        // 3. Simply use the direct Google API link via standard fetch
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                systemInstruction: {
                    parts: [{ text: "You are Quans Intelligence, a highly professional cybernetic terminal framework. Keep answers brief, clean, and highly technical." }]
                }
            })
        });

        const data = await googleResponse.json();

        if (!googleResponse.ok) {
            return res.status(googleResponse.status).json({ error: data.error?.message || "Google API error" });
        }

        // 4. Extract the clean text reply from Google's data structure
        const aiAnswer = data.candidates[0].content.parts[0].text;

        // 5. Send it back to your frontend index.html safely
        return res.status(200).json({ answer: aiAnswer });

    } catch (error) {
        return res.status(500).json({ error: 'Server Exception: ' + error.message });
    }
}
