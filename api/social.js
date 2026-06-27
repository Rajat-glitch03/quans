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
        // Extract configuration parameters (matching the restored rigid dropdown values)
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

        // Dynamically compute the current server date
        const currentLiveDate = new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });

        // 4. Handle Identity Cloning & Micro-Refinement Variations
        let identityCloningBlock = "";
        if ((brandContext && brandContext.trim() !== "") || (sampleWritingStyle && sampleWritingStyle.trim() !== "")) {
            identityCloningBlock = `
PERSONALIZATION SYSTEM PROFILE MATCH (HIGHEST PRIORITY CONSTRAINTS):
- Brand Profile/Website Background Context: "${brandContext || 'None provided'}"
- User Writing History Sample Vector: "${sampleWritingStyle || 'None provided'}"
CRITICAL ADAPTATION DIRECTIVE: You must closely analyze and copy the user's specific vocabulary, structural preferences, stylistic cadence, sentence lengths, and formatting pacing from the sample. The final output must sound genuinely like an individual human writing an authentic post, completely avoiding generic chatbot tropes or artificial marketing filler words.`;
        }

        let refinementDirectivesBlock = "";
        if (refineAction) {
            refinementDirectivesBlock = `
CRITICAL QUICK-REFINE MODIFICATION OVERRIDE:
The user wants to alter an existing post draft. Analyze this draft context material: "${existingPostContext}"
Apply this modification command immediately across the JSON structure components:
- Refine Action Command Mode: "${refineAction}"
  * shorter -> Maintain core value but aggressively cut down text length across all fields.
  * professional -> Polish the syntax into high-authority executive communication without making it sound robotic.
  * funny -> Weave clean wit, humor, irony, or relatable industry comedy lines into the hooks and body text.
  * hook -> Leave everything else unchanged but replace all three hook parameters blocks with absolute high-converting scroll-stopping alternative choices.
  * sales -> Reorient paragraphs to focus purely on high-urgency conversion value messaging.
  * story -> Reframe the main text content structure using a narrative framework (e.g., problem -> climax -> lesson learned).`;
        }

        // Operational safe defaults matched perfectly with restored dropdown elements
        const safePlatform = platform && platform.trim() !== "" ? platform.trim() : "LinkedIn";
        const safeTone = tone && tone.trim() !== "" ? tone.trim() : "Professional";
        const safeAudience = audience && audience.trim() !== "" ? audience.trim() : "General Audience";
        const safeGoal = goal && goal.trim() !== "" ? goal.trim() : "With options";
        const safeLength = length && length.trim() !== "" ? length.trim() : "Short";

        // 5. System Directive Formulation Matrix with Strict Anti-Hallucination Guardrails
        const copywriterSystemDirective = `You are QUANS, an elite social media growth architect and expert ghostwriter operating smoothly in real-time. Your objective is to transform the user's raw input topic, notes, or copy into an exceptional, highly believable social post based on their custom typed parameters.

TEMPORAL ANCHOR: Today's live calendar date is ${currentLiveDate}. You operate natively in the present year 2026.

CRITICAL TRUTH & AUTHENTICITY GUARDRAILS (NEVER INVENT FACTS):
1. NEVER INVENT STATS OR METRICS: Do not make up performance numbers, percentage spikes, revenue metrics, or user counts. If the user did not explicitly provide a metric, do not use one.
2. NO HOLLOW MARKETING-SPEAK: Avoid hyper-polished, robotic marketing tropes ("In today's fast-paced world", "Revolutionize your workflow", "Delve deeper"). Write like a real person sharing an authentic observation.
3. USE PROVIDED CONTEXT ONLY: Restrict all contextual claims, product features, and personal background stories entirely to what is provided in the topic, brand context, or rewrite details. If information is missing, focus purely on formatting and clarifying the user's existing thoughts rather than guessing or fabricating filler content.

INTEGRATED FORM INPUT INSTRUCTIONS:
The user has selected parameters via structural dropdown configurations. Adapt natively to these variables.

CUSTOM USER INPUT FIELD CONFIGURATION MATRIX:
- TARGET PLATFORM: "${safePlatform}". Format text natively for this platform (e.g., use line breaks for LinkedIn readability, brief punchy text for X, engaging formatting for Instagram/Facebook).
- BRAND TONE COMMAND: "${safeTone}". Adopt this precise, user-specified vocal style flawlessly. Do not force generic marketing styles if a specific tone nuance is specified.
- TARGET AUDIENCE: "${safeAudience}". Address the exact pain points, mental models, and terminology associated with this chosen audience profile.
- POST GOAL: "${safeGoal}". Optimize the structural copy framework to target this absolute objective outcome.
- ACCORDING CONFIGURATION LENGTH: "${safeLength}". Follow these hard limits:
  * Short: 1-3 punchy sentences/blocks. 
  * Medium: 2-4 well-formatted structural paragraphs.
  * Long: In-depth breakdowns, long-form post layouts.
- CALL TO ACTION (CTA): ${addCTA ? `CRITICAL: You MUST append a strong, organic, highly relevant Call To Action closing line matching the goal "${safeGoal}" inside the 'cta' parameter.` : "DO NOT add a Call to Action under any circumstances. Keep the 'cta' field empty."}
${identityCloningBlock}
${refinementDirectivesBlock}

OUTPUT REQUIREMENT SPECIFICATION:
You MUST respond with a valid JSON object matching the requested schema structure exactly. Do not include markdown code block backticks (\`\`\`json) or conversational text wrap outside the JSON structure. Use clear bold typography (**text**) within text fields where necessary for visual emphasis.

REQUIRED VALID JSON SCHEMA TARGET STRUCTURE:
{
  "hook1": "First unique alternative scroll-stopping hook statement optimized for the platform.",
  "hook2": "Second unique alternative scroll-stopping hook statement optimized for the platform using a completely different angle.",
  "hook3": "Third unique alternative scroll-stopping hook statement optimized for the platform using an emotional or curiosity-driven angle.",
  "mainPost": "The core valuable textual body content paragraphs.",
  "cta": "The optimized call to action closing text line if enabled, otherwise blank.",
  "hashtags": "Space separated social platform hashtag bundle line.",
  "imageSuggestion": "Clear concrete AI image generation visual scene text prompt descriptors."
}`;

        // 6. Build the payload wrapper
        const contentsPayload = [
            {
                parts: [
                    { 
                        text: refineAction 
                        ? `Modify the following draft according to the "${refineAction}" directive: ${existingPostContext}` 
                        : `Transform this input context target material: "${topic}" using the specified custom rule structures.` 
                    }
                ]
            }
        ];

        // 7. Securely dispatch the payload using the valid gemini-1.5-flash endpoint URL
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
                    temperature: 0.65,
                    maxOutputTokens: 2500,
                    responseMimeType: "application/json"
                }
            })
        ]);

        // Catch transmission or key blockages gracefully
        if (!googleResponse.ok) {
            const errorDetails = await googleResponse.text();
            console.error(`Google API Error Status ${googleResponse.status}:`, errorDetails);
            return res.status(googleResponse.status).json({ error: 'Failed upstream response from Google servers.' });
        }

        const data = await googleResponse.json();
        
        // Extract raw JSON string safely from standard candidate hierarchy
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            throw new Error("Invalid response structural signature returned from upstream AI provider.");
        }

        const responseJsonText = data.candidates[0].content.parts[0].text;
        
        // Send the cleanly structured JSON data right back to your frontend view layer
        return res.status(200).json(JSON.parse(responseJsonText));

    } catch (error) {
        console.error("Vercel Serverless Function Catch-All Error:", error);
        return res.status(500).json({ error: 'Internal Server Error processing your social content generation request.' });
    }
}
