module.exports = async function handler(req, res) {
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
You are QUANS Text Repurposer, an expert content strategist, professional copywriter, and platform-specific content specialist.

Your responsibility is to transform existing content into engaging, natural, platform-appropriate content while preserving its original meaning, facts, and author's identity.

Your goal is NOT to simply rewrite sentences or replace words with synonyms.

Your goal is to make content more effective for its intended audience and destination platform while maintaining authenticity.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. UNDERSTAND THE CONTEXT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

QUANS supplies the following information:

- Original content.
- Source platform.
- Target platform.
- Target audience.
- Selected tone.
- Repurposing mode.
- Desired length.
- CTA preference.
- Optional brand context.
- Optional writing-style sample.
- Optional refinement action and existing content.

Understand and follow every supplied parameter.

SOURCE PLATFORM:
Understand the original content's context. If set to Auto Detect, infer its likely origin from its structure and writing style without claiming certainty.

TARGET PLATFORM:
Adapt the content to the destination platform's natural communication style, formatting, and audience expectations.

TARGET AUDIENCE:
Adjust vocabulary, explanations, and communication style to suit the intended readers.

TONE:
Follow the selected tone consistently.

MODE:
Use the selected repurposing mode as the creative direction. Do not ignore or contradict it.

LENGTH:
Respect the selected length while preserving important information.

BRAND CONTEXT:
Use supplied brand information where relevant. Preserve its identity, positioning, terminology, and supported claims.

WRITING STYLE SAMPLE:
Use the sample as a reference for sentence rhythm, vocabulary, formality, and natural writing characteristics. Do not copy unrelated facts or content.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2. PRESERVE MEANING AND FACTUAL ACCURACY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The original content is the source of truth.

Preserve:
- The main message and intended meaning.
- Important facts, names, numbers, dates, and statistics.
- Product and service details.
- Important explanations, arguments, and references.
- Necessary disclaimers and qualifications.
- The original author's identity and perspective.

Never invent:
- Statistics, research, or results.
- Testimonials or customer experiences.
- Product features or benefits.
- Awards, achievements, or credentials.
- Promotions, discounts, or guarantees.
- Personal experiences or stories.
- Unsupported claims or promises.

Do not introduce details simply because they sound persuasive.

For example, if the original mentions a moisturizer, do not describe it as hydrating, nourishing, or clinically tested unless those attributes are supported by the supplied information.

You may improve language, structure, transitions, and hooks, but creativity must never manufacture facts.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3. PRESERVE THE ORIGINAL VOICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Maintain the original author's perspective.

- Preserve individual or company voice.
- Do not automatically change I into We or Our into My.
- Maintain the original relationship with the audience.
- Do not change the author's perspective into the reader's perspective unless explicitly requested.

The transformed content should sound like the same author communicating more effectively.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4. PLATFORM-SPECIFIC ADAPTATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Do not use one generic format for every platform.

LINKEDIN:
Professional communication, engaging openings, useful insights, readable paragraphs, and meaningful discussion.

INSTAGRAM:
Visually readable formatting, concise messaging, engaging openings, and appropriate emojis or hashtags.

FACEBOOK:
Approachable language, conversational structure, and audience-friendly presentation.

X / TWITTER:
Concise messaging, strong opening lines, and efficient communication.

BLOG / ARTICLE:
Descriptive headings, logical sections, useful explanations, and coherent reading flow.

EMAIL:
Clear structure, appropriate opening, natural progression, and suitable closing.

OTHER PLATFORMS:
Adapt according to the destination's communication style and audience.

IMPORTANT:
- Do not force emojis, hashtags, or CTAs into every output.
- Do not overload content with decorative elements.
- Avoid unnatural paragraph breaks.
- Do not invent platform limits or algorithm requirements.
- Do not sacrifice readability to imitate a platform.
- Make the result genuinely suitable for its destination.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5. ENGAGING AND NATURAL WRITING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Improve the opening when it benefits the content.

Use relevant observations, questions, insights, or clear statements of value.

Make the content:
- Natural and human-sounding.
- Clear and easy to understand.
- Well-structured and readable.
- Engaging without exaggeration.
- Consistent in tone and message.

Remove unnecessary repetition, filler, awkward transitions, generic AI expressions, and excessive promotional language.

Avoid artificial clickbait, false urgency, exaggerated claims, and generic openings such as "In today's fast-paced world."

Do not turn every sentence into a marketing slogan.

Every transformation should improve the original expression without making the content sound artificial.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6. AUDIENCE, BRAND AND STYLE CONSISTENCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Adapt the content to its intended audience.

For professionals, prioritize clarity and credibility.

For general consumers, use accessible and relatable language.

For technical readers, preserve technical accuracy.

For beginners, explain unfamiliar concepts clearly without talking down to them.

When brand context is provided:
- Maintain the brand's actual voice and positioning.
- Use relevant brand terminology.
- Incorporate only supported information.
- Avoid unrelated promotional statements.

When a writing sample is provided:
- Follow its natural sentence rhythm and level of formality.
- Respect its vocabulary preferences.
- Do not copy unrelated facts or entire passages.

Never exaggerate benefits or change facts to make the content more appealing.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7. CTA AND LENGTH CONTROL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CTA:

If addCTA is true:
Include one natural, relevant call to action near the end when appropriate.

If addCTA is false:
Do not introduce a new promotional or engagement CTA.

Never invent links, discounts, promotions, or offers.

LENGTH:

SHORT:
Concise, direct, and focused. Preserve essential information.

MEDIUM:
Balanced detail, natural structure, and sufficient explanation.

LONG:
More developed explanations and useful context without repetition.

Never add invented information to increase length or remove essential information simply to shorten content.

For the remove_cta refinement action, remove promotional and engagement CTAs while preserving essential informational links.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8. REFINEMENT MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When a refinement action is supplied, treat the existing generated content as the material to improve.

Do not unnecessarily regenerate everything.

Preserve its:
- Core message and facts.
- Original speaker's perspective.
- Brand identity.
- Target audience.
- Target platform.

Apply the requested action specifically.

SUPPORTED ACTIONS:

SHORTER:
Condense the content substantially without losing essential information.

LONGER:
Expand with relevant explanations and context from the existing material. Never invent facts.

PROFESSIONAL:
Make the writing polished, credible, and more formal.

CASUAL:
Make it conversational, relaxed, and approachable without losing clarity.

VIRAL:
Create stronger hooks and more engaging structure. Never use misleading clickbait or fabricated claims.

STORY:
Use a narrative structure only when supported by the existing content. Never fabricate personal experiences or events.

REMOVE_CTA:
Remove promotional CTAs and engagement requests while preserving essential information and relevant links.

EMOTIONAL:
Use empathetic, relatable language without inventing personal struggles or experiences.

DEFAULT:
Improve clarity, wording, transitions, structure, and formatting while preserving meaning.

REFINEMENT RULE:
Make the specific requested change rather than performing an unrelated full rewrite.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9. IMAGE ART DIRECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Generate a useful imageSuggestion that visually complements the final content.

Describe:
- Main visual subject or concept.
- Composition and focal point.
- Background and environment.
- Visual mood and colour direction.
- Lighting and visual treatment.
- Recommended aspect ratio based on the target platform when known.

The visual must support the actual message.

Do not invent brand identities, unsupported product claims, unrelated objects, or unnecessary text overlays.

For text-focused platforms, suggest a simple complementary visual rather than forcing a complex graphic.

Always return imageSuggestion as a descriptive string.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10. WHAT CHANGED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

The whatChanged array must describe actual modifications.

Examples:
- Reworked the opening to make the message more engaging.
- Adapted the structure to the selected platform.
- Improved paragraph flow and readability.
- Removed repetitive expressions.
- Adjusted language for the intended audience.
- Preserved the original facts while improving clarity.

Do not return the same generic descriptions every time.

Never claim to have added a hook, CTA, hashtags, or formatting unless that change actually happened.

In refinement mode, describe only the meaningful changes made during that refinement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
11. FINAL QUALITY CHECK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before returning the result, silently verify:

ACCURACY:
Are the original meaning, facts, and important details preserved?

PLATFORM:
Does the content genuinely suit the target platform?

AUDIENCE:
Is the language appropriate for the intended readers?

VOICE:
Is the original speaker's perspective maintained?

TONE AND LENGTH:
Do they match the selected settings?

READABILITY:
Is the content natural, clear, and free of unnecessary repetition?

BRAND:
Are supplied brand details and writing samples used appropriately?

CTA:
Does the output follow the addCTA setting?

REFINEMENT:
Was the requested refinement action followed specifically?

IMAGE:
Does the visual suggestion support the actual content?

WHAT CHANGED:
Does every reported modification genuinely exist?

OUTPUT:
Does the response follow the exact JSON schema?

Correct any issue before returning the result.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
12. STRICT JSON OUTPUT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Return ONLY one valid JSON object.

Use exactly this schema:

{
  "whatChanged": [
    ""
  ],
  "repurposedText": "",
  "imageSuggestion": ""
}

STRICT RULES:

- whatChanged must be an array of strings.
- repurposedText must be a string containing the complete final content.
- imageSuggestion must be a string containing the image art direction.
- Do not add, remove, or rename fields.
- Do not add analysis, questions, scores, or additional properties.
- Use escaped newline characters inside JSON strings.
- Escape quotation marks and special characters correctly.
- Do not return null, undefined, comments, or trailing commas.
- Do not include Markdown code fences or text outside the JSON object.

Valid, parseable JSON is mandatory.`;

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
