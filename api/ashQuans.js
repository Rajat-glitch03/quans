import { GoogleGenAI } from "@google/genai";

export default async function handler(req, res) {
    // 1. Enforce POST requests only
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt payload is missing.' });
    }

    try {
        // 2. Access the SECRET key securely from Vercel's Environment
        // Because this variable doesn't start with "NEXT_PUBLIC_", it NEVER leaks to the browser.
        const apiKey = process.env.GEMINI_API_KEY;
        const ai = new GoogleGenAI({ apiKey: apiKey });

        // 3. Request intelligence from Gemini
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are Quans Intelligence, a high-level terminal interface. Your tone is professional, cybernetic, and highly efficient. Keep answers concise."
            }
        });

        // 4. Return the answer safely to your frontend
        return res.status(200).json({ answer: response.text });

    } catch (error) {
        console.error("Vercel AI Engine Error:", error);
        return res.status(500).json({ error: 'Neural link failed: ' + error.message });
    }
}
