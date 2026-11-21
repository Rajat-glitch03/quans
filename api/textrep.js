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
        // Extract parameters matching the exact client payload structure from textrep.html
        const { 
            content, sourcePlatform, targetPlatform, audience, tone, mode, length, addCTA,
            brandContext, sampleWritingStyle, refineAction, existingContentContext 
        } = req.body;

        if (!content && !existingContentContext) {
            return res.status(400).json({ error: 'Missing core text input parameter content.' });
        }

        // 3. Extract the secret key securely from the ecosystem environment variables
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("Deployment Error: GEMINI_API_KEY is not defined in Environment Variables.");
            return res.status(500).json({ error: 'Server configuration error: Missing API Key.' });
        }

        // Dynamically compute the current server date context
        const currentLiveDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

        // 4. Construct a strict structural system directive for JSON formatting
        const copywriterSystemDirective = `
You are an expert content strategist and copywriter specializing in Omni-Channel Content Repurposing. Your job is to transform raw input text from a source platform into highly optimized platform-specific assets.

CRITICAL: You must return your entire response as a valid, pure JSON object matching this schema EXACTLY:
{
  "whatChanged": [
    "✓ Hook rewritten",
    "✓ CTA strengthened",
    "✓ Paragraphs shortened",
    "✓ Better spacing",
    "✓ Platform formatting"
  ],
  "repurposedText": "The entire final repurposed post text content goes here. Use double newlines for clear spacing. Use emojis if platform native.",
  "imageSuggestion": "Detailed art direction prompt for an image builder.\\n\\nElement 1\\nElement 2\\nRatio style details."
}

Ensure to strictly format the output text inside the JSON string properly (e.g., escape quotes with \\" and encode literal linebreaks with \\n). Avoid code block markers like \`\`\`json. Return only the raw JSON.
`;

        // 5. Build context instructions for base generation or refinement variants
        let dynamicUserContentPayload = "";

        if (refineAction) {
            // Unpack previously generated JSON context
            let historicalContextText = "";
            try {
                const parsedContext = JSON.parse(existingContentContext);
                historicalContextText = parsedContext.repurposedText || "";
            } catch (e) {
                historicalContextText = existingContentContext;
            }

            // Map micro-refinement requests cleanly
            let optimizationGoalText = "";
            switch (refineAction) {
                case 'shorter':
                    optimizationGoalText = "Condense the content drastically. Make it concise and punchy without losing the main value proposition.";
                    break;
                case 'longer':
                    optimizationGoalText = "Expand the text with deeper details, structural examples, and immersive formatting matching the platform configuration.";
                    break;
                case 'professional':
                    optimizationGoalText = "Shift tone to an authoritative, crisp corporate profile style. Eliminate overly casual expressions or slang.";
                    break;
                case 'casual':
                    optimizationGoalText = "Make it highly conversational, relaxed, friendly, and relatable, like talking to a friend over coffee.";
                    break;
                case 'viral':
                    optimizationGoalText = "Inject extreme hooks, high curiosity loops, punchy spacing, high emotional resonance, and high-engagement formatting.";
                    break;
                case 'story':
                    optimizationGoalText = "Weave an narrative-driven framework, personal anecdote, or situational storytelling case-study directly into the post body structure.";
                    break;
                case 'remove_cta':
                    optimizationGoalText = "Strip away all concluding pitches, direct response URLs, and call-to-actions, leaving it purely value/educational focused.";
                    break;
                case 'emotional':
                    optimizationGoalText = "Weave strong psychological triggers, high empathy hooks, vulnerabilities, challenges, or relatable human factors into the prose framework.";
                    break;
                default:
                    optimizationGoalText = "Refine, optimize layout alignment, and clear up awkward expressions.";
            }

            dynamicUserContentPayload = `
Task: Apply a micro-refinement tweak to a previously generated content layout.
Today's Date: ${currentLiveDate}

Target Platform Environment: ${targetPlatform}
Target Audience Segment: ${audience}
Configured Tone: ${tone}
Repurpose Strategy Mode: ${mode}

Existing Content Workspace to Refine:
"""
${historicalContextText}
"""

Tweak Optimization Command:
${optimizationGoalText}

Update your "whatChanged" parameters array to list the changes made during this iteration. Keep the image art direction aligned with the updated tone.
`;
        } else {
            // Standard generation payload matching all textrep.html parameter fields
            let ctaRuleDirective = addCTA 
                ? "Ensure you append an actionable, high-conversion Call To Action (CTA) near the end." 
                : "Do not append a promotion or call to action. Keep it purely native and native-value driven.";

            let brandProfileDirective = brandContext 
                ? `Inject this brand profile/website context details where relevant: ${brandContext}` 
                : "";

            let stylisticVoiceDirective = sampleWritingStyle 
                ? `Strictly mimic the cadence, sentence length variations, punctuation behaviors, and linguistic style of this user sample: """\n${sampleWritingStyle}\n"""` 
                : "";

            dynamicUserContentPayload = `
Task: Repurpose the following raw text content asset.
Today's Date: ${currentLiveDate}

[REPURPOSING ENVIRONMENT METRICS]
- Source Platform Context: ${sourcePlatform} (If 'Auto Detect', determine the origin style dynamically)
- Target Platform: ${targetPlatform} (Format specifically for this environment's structural strengths, restrictions, and quirks)
- Target Audience Focus: ${audience}
- Voice & Tone Signature: ${tone}
- Repurpose Philosophy Mode: ${mode}
- Desired Length Profile: ${length}

[BRAND AND STYLE PRESETS]
${ctaRuleDirective}
${brandProfileDirective}
${stylisticVoiceDirective}

[RAW INPUT SOURCE CONTENT]
"""
${content}
"""

Execute your transformation logic. Populate the "whatChanged" array with clear bullets detailing how you optimized the structure (e.g., hooks, spacing, platform tone). Output the complete blueprint.
`;
        }

        // 6. Execute direct network request to Google Gemini API infrastructure via streaming gateway
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    parts: [{ text: dynamicUserContentPayload }]
                }],
                systemInstruction: {
                    parts: [{ text: copywriterSystemDirective }]
                },
                generationConfig: {
                    temperature: 0.6,
                    responseMimeType: "application/json"
                }
            })
        });

        // Catch connection anomalies or upstream blockages gracefully
        if (!googleResponse.ok) {
            const errorDetails = await googleResponse.text();
            console.error(`Google API Error Status ${googleResponse.status}:`, errorDetails);
            return res.status(googleResponse.status).json({ error: 'Failed upstream response from Google servers.' });
        }

        const data = await googleResponse.json();
        
        // Validate payload object architecture
        if (!data.candidates || !data.candidates[0] || !data.candidates[0].content || !data.candidates[0].content.parts || !data.candidates[0].content.parts[0]) {
            throw new Error("Invalid response structural signature returned from upstream AI provider.");
        }

        const responseJsonText = data.candidates[0].content.parts[0].text;
        
        // Return pure structured JSON directly to the frontend view layer
        return res.status(200).json(JSON.parse(responseJsonText));

    } catch (error) {
        console.error("Server Execution Context Exception Handler:", error);
        return res.status(500).json({ error: 'Internal Server Error processing your content repurposing architecture request.' });
    }
}
