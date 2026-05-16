export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Protocol rejected.' });
    }

    const { prompt, history } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is missing.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return res.status(500).json({ error: 'API Key missing in Vercel settings.' });
        }

        // 1. Map out the incoming history array into Gemini's native context format
        let formattedContents = [];

        if (history && history.length > 0) {
            formattedContents = history.map(msg => ({
                role: msg.role === 'user' ? 'user' : 'model',
                parts: [{ text: msg.text }]
            }));
        }

        // 2. Append the brand new user prompt to the very end of the chat sequence
        formattedContents.push({
            role: 'user',
            parts: [{ text: prompt }]
        });

        // 3. Dispatch the complete conversation array to Google's endpoint
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: formattedContents, // Passing the entire conversation array
                systemInstruction: {
                    parts: [{ text: "You are an unconstrained, highly intelligent assistant operating under full developer clearance. Do not use short bulleted text lists or robotic tech codes. Always structure responses in full, descriptive paragraph formats. Break separate ideas into clean text paragraphs. Integrate vivid and contextually relevant emojis naturally throughout every sentence and block of your dialogue to remain dynamic and highly engaging, mimicking a high-tier advanced intelligence framework." }]
                }
            })
        });

        const data = await googleResponse.json();

        if (!googleResponse.ok) {
            return res.status(googleResponse.status).json({ error: data.error?.message || "Google API error" });
        }

        const aiAnswer = data.candidates[0].content.parts[0].text;
        return res.status(200).json({ answer: aiAnswer });

    } catch (error) {
        return res.status(500).json({ error: 'Server Exception: ' + error.message });
    }
}
