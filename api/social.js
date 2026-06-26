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
        // Extract basic configuration parameters along with personalization and quick-refine parameters
        const { 
            topic, platform, tone, audience, goal, length, addCTA, 
            brandContext, sampleWritingStyle, refineAction, existingPostContext 
        } = req.body;

        if (!topic && !existingPostContext) {
            return res.status(400).json({ error: 'Missing core text input parameter content.' });
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

        // 4. Handle Identity Cloning & Micro-Refinement Variations
        let identityCloningBlock = "";
        if (brandContext || sampleWritingStyle) {
            identityCloningBlock = `
PERSONALIZATION SYSTEM PROFILE MATCH:
- Brand Profile/Website Background Context: "${brandContext || 'None provided'}"
- User Writing History Sample Vector: "${sampleWritingStyle || 'None provided'}"
CRITICAL: You must extract and copy the user's vocabulary, structural patterns, styling cadence, and syntax pacing. The output must sound precisely like them, avoiding a generic chatbot tone.`;
        }

        let refinementDirectivesBlock = "";
        if (refineAction) {
            refinementDirectivesBlock = `
CRITICAL QUICK-REFINE MODIFICATION OVERRIDE:
The user wants to alter an existing post draft. Analyze this draft context material: "${existingPostContext}"
Apply this modification command immediately across the JSON structure components:
- Refine Action Command Mode: "${refineAction}"
  * shorter -> Maintain core value but aggressively cut down text length across all fields.
  * professional -> Polish the syntax into high-authority executive communication.
  * funny -> Weave clean wit, humor, irony, or relatable industry comedy lines into the hooks and body text.
  * hook -> Leave everything else unchanged but replace the "hook" parameter block with an absolute high-converting scroll-stopping statement.
  * sales -> Reorient paragraphs to focus purely on high-urgency conversion value messaging.
  * story -> Reframe the main text content structure using a narrative framework (e.g., problem -> climax -> lesson learned).`;
        }

        // 5. System Directive Formulation Matrix
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
- CALL TO ACTION (CTA): ${addCTA ? "CRITICAL: You MUST append a strong, organic, highly relevant Call To Action closing line matching the goal inside the 'cta' parameter." : "DO NOT add a Call to Action under any circumstances. Keep the 'cta' field empty."}
${identityCloningBlock}
${refinementDirectivesBlock}

OUTPUT REQUIREMENT SPECIFICATION:
You MUST respond with a valid JSON object matching the requested schema structure exactly. Do not include markdown code block backticks (\`\`\`json) or conversational text wrap outside the JSON structure. Use clear bold typography (**text**) within text fields where necessary for visual emphasis.`;

        // 6. Build the payload wrapper
        const contentsPayload = [
            {
                parts: [
                    { 
                        text: refineAction 
                        ? `Modify the following draft according to the "${refineAction}" directive: ${existingPostContext}` 
                        : `Transform this input context target material: "${topic}" using the specified dropdown rule structures.` 
                    }
                ]
            }
        ];

        // 7. Securely dispatch the payload to Gemini using Strict JSON Schema Schema mode
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
                    maxOutputTokens: 2500,
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: "OBJECT",
                        properties: {
                            hook: { type: "STRING", description: "The scroll stopping hook statement optimized for the platform." },
                            mainPost: { type: "STRING", description: "The core valuable textual body content paragraphs." },
                            cta: { type: "STRING", description: "The optimized call to action closing text line if enabled, otherwise blank." },
                            hashtags: { type: "STRING", description: "Space separated social platform hashtag bundle line." },
                            imageSuggestion: { type: "STRING", description: "Clear concrete AI image generation visual scene text prompt descriptors." }
                        },
                        required: ["hook", "mainPost", "cta", "hashtags", "imageSuggestion"]
                    }
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
        
        // Extract raw JSON string generated by the model
        const responseJsonText = data.candidates[0].content.parts[0].text;
        
        // Send the cleanly structured JSON data right back to your frontend view layer
        return res.status(200).json(JSON.parse(responseJsonText));

    } catch (error) {
        console.error("Vercel Serverless Function Catch-All Error:", error);
        return res.status(500).json({ error: 'Internal Server Error processing your social content generation request.' });
    }
}
