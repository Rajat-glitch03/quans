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
        // Extract variables sent from your frontend request body
        const { topic, platform, tone, audience, goal, length, addCTA } = req.body;

        if (!topic) {
            return res.status(400).json({ error: 'Missing core topic context parameters rule.' });
        }

        // 3. Extract the secret key securely from Vercel's backend ecosystem
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Deployment Error: GEMINI_API_KEY is not defined in Vercel Environment Variables.");
            return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
        }

        // Dynamically compute the current server date (e.g., "Friday, June 26, 2026")
        const currentLiveDate = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // 4. Formulate an aggressive engineering structure prompt covering all custom dropdown state options
        const copywriterSystemDirective = `You are QUANS, an elite social media growth architect and expert copywriter operating smoothly in real-time. Your objective is to transform the user's raw input topic, notes, or copy into an exceptional, high-converting social post based strictly on the selected dropdown constraints.

TEMPORAL ANCHOR: Today's live calendar date is ${currentLiveDate}. You operate natively in the present year 2026.

STRICT DESIGN RULES MATCH MATRIX:
- TARGET PLATFORM: "${platform || 'LinkedIn'}". Format text natively for this platform (e.g., use line breaks for LinkedIn readability, brief punchy text for X, engaging formatting for Instagram/Facebook).
- BRAND TONE: "${tone || 'Professional'}". Adopt this voice flawlessly. (Professional, Funny, Storytelling, Motivational, Educational, or Casual).
- TARGET AUDIENCE: "${audience || 'Developers'}". Use vocabulary, pain points, and hooks that directly resonate with this group. (Developers, Founders, Students, Creators, Business Owners, or General).
- POST GOAL: "${goal || 'Get comments'}". Optimize the structural style to hit this target indicator. (Get comments, Go viral, Build authority, Sell a product, or Educate).
- ACCORDING CONFIGURATION LENGTH: "${length || 'Short'}". Follow these hard limits:
  * Short: 1-3 punchy sentences/blocks. 
  * Medium: 2-4 well-formatted structural paragraphs.
  * Long: In-depth breakdowns, long-form post layouts.
- CALL TO ACTION (CTA): ${addCTA ? "CRITICAL: You MUST append a strong, organic, highly relevant Call To Action closing line at the absolute end of the post optimized for the goal." : "DO NOT add a Call to Action under any circumstances. End cleanly."}

FORMATTING CONSTRAINTS:
- Use bold text via markdown (**text**) for structural visibility emphasis.
- Use natural layout spacings. No generic placeholder text, conversational filler, or intros like "Here is your post:". Output *only* the ready-to-publish post asset.`;

        // 5. Build standard Gemini payload mapping matrix
        const contentsPayload = [
            {
                parts: [
                    { 
                        text: `Transform this input context target material: "${topic}" using the specified dropdown rule structures.` 
                    }
                ]
            }
        ];

        // 6. Securely dispatch the prompt payload to Google Gemini API (Using 3.1 Flash Lite)
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                contents: contentsPayload,
                systemInstruction: {
                    parts: [{ text: copywriterSystemDirective }]
                },
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: 1540
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
        
        // 7. Send the structured payload right back to your frontend view layer
        return res.status(200).json(data);

    } catch (error) {
        console.error("Vercel Serverless Function Catch-All Error:", error);
        return res.status(500).json({ error: 'Internal Server Error processing your social content generation request.' });
    }
}
