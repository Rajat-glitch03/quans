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
        // Extract all current active configuration parameters from the client-side payload
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
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
        });

        // Personalization identity mapping blocks (Brand Identity Scanner data)
        let identityCloningBlock = "";
        if ((brandContext && brandContext.trim() !== "") || (sampleWritingStyle && sampleWritingStyle.trim() !== "")) {
            identityCloningBlock = `
PERSONALIZATION SYSTEM IDENTITY MATCH MATCH MATRIX:
- Brand Profile Context: "${brandContext || 'None'}"
- Sample Writing History Syntax: "${sampleWritingStyle || 'None'}"
DIRECTIVE: Mirror the natural syntax voice, vocabulary structure, and writing style cadence defined above. Avoid automated chat filler.`;
        }

        // Micro-prompt variant controller overrides
        let refinementDirectivesBlock = "";
        if (refineAction) {
            refinementDirectivesBlock = `
MODIFICATION OVERRIDE INSTRUCTION:
Refine the following existing output context: "${existingPostContext}"
Execute this exact micro-action modification variant: "${refineAction}"`;
        }

        // Fallback sanitization rules matching rigid dropdown UI states
        const safePlatform = platform && platform.trim() !== "" ? platform.trim() : "LinkedIn";
        const safeTone = tone && tone.trim() !== "" ? tone.trim() : "Professional";
        const safeAudience = audience && audience.trim() !== "" ? audience.trim() : "Developers";
        const safeGoal = goal && goal.trim() !== "" ? goal.trim() : "Get comments";
        const safeLength = length && length.trim() !== "" ? length.trim() : "Short";

        // 4. Formulate an aggressive engineering structure prompt covering all custom dropdown state options
        const copywriterSystemDirective = `You are QUANS, an elite social media growth architect and expert copywriter operating smoothly in real-time. Your objective is to transform the user's raw input topic context into an exceptional, high-quality, engaging, platform-native social post.

TEMPORAL ANCHOR: Today's live calendar date is ${currentLiveDate}. You operate natively in the present year 2026.

STRICT DESIGN RULES MATCH MATRIX:
- TARGET PLATFORM: "${safePlatform}". Format layout rules natively for this channel (LinkedIn spacing, punchy X hooks, engaging Instagram layouts, etc.).
- BRAND TONE: "${safeTone}". Adopt this voice perfectly (Professional, Funny, Storytelling, Motivational, Educational, Casual).
- TARGET AUDIENCE: "${safeAudience}". Direct your content layout specifically toward this segment (Developers, Founders, Students, Creators, Business Owners, General).
- POST GOAL: "${safeGoal}". Optimize the writing style based on the selected goal. (Get comments, Go viral, Build authority, Sell a product, Educate).
- LENGTH CONFIGURATION: "${safeLength}". Follow these absolute layout size limitations:
  * Short: 1-3 highly precise, punchy sentences/blocks.
  * Medium: 2-4 well-formatted structural paragraphs.
  * Long: Detailed long-form analytical breakdowns.
- CALL TO ACTION (CTA): ${addCTA ? "Include an organic, highly relevant Call To Action closing line tailored to the asset goal." : "DO NOT add any Call to Action closing text. End smoothly and cleanly."}
${identityCloningBlock}
${refinementDirectivesBlock}

CRITICAL OUTPUT REQUIREMENT:
You must respond ONLY with a clean, fully formed JSON object using the exact structural key layout defined below. Do not wrap your response in markdown backticks (\`\`\`json) or include conversational prefix text.

REQUIRED JSON STRUCTURAL LAYOUT:
{
  
  "hook1: Curiosity-driven, scroll-stopping opener.",
  "hook2: Strong opinion or contrarian opener.",
  "hook3: Question or insight-driven opener.",
  "mainPost": "The core post structural content body lines formatted with rich markdown parameters",
  "cta": "The optimized closing call to action line segment if requested, or blank string if not",
  "hashtags": "#example #tags formatted cleanly based on platform relevance",
  "imageSuggestion": "Describe a realistic image that complements the post.
                      Avoid text-heavy graphics.
                      Prefer scenes a creator could actually generate or photograph."

}
Instead of generating a single hook, generate THREE unique hook variations.

Each hook must:
- Follow a different psychological angle.
- Be genuinely different, not a reworded version.
- Be optimized for the selected platform.
- Match the selected tone, audience, and goal.
- Create curiosity, challenge a common belief, ask a thought-provoking question, or present a strong opinion.
- Avoid generic openings and AI-sounding language.

After generating the three hooks, select the strongest one naturally to continue writing the main post. The main post, CTA, hashtags, and image suggestion should be based on that strongest hook.
Never claim personal experience, years of work, client numbers, revenue improvements, statistics, testimonials, or case studies unless the user explicitly provides them. If unsure, write observations instead of personal claims.
Write like an experienced human founder or creator having a genuine conversation. Never sound like an AI assistant, marketing brochure, or corporate press release.
Never assume the user's business achievements, products, experience, opinions, customers, or history.

Only use information explicitly provided.
Avoid overused AI phrases such as:

Game changer
Revolutionary
Unlock your potential
Cutting-edge
Leverage
Synergy
Transform your business
Operational overhead
Bleeding cash
Best-in-class
World-class
Sales machine
Next level

Prefer simple English over complex vocabulary.

If a shorter word communicates the same idea, always use the shorter word.

Before returning the final JSON, Before returning the JSON, ask yourself:

Would a real creator confidently publish this without editing?

If the answer is no, improve it before responding. your own output.

Check for:

- Invented facts
- Invented numbers
- Invented experience
- AI-sounding language
- Corporate buzzwords
- Weak hook
- Platform mismatch

If any issue exists, rewrite the response before returning it.

Hooks should create curiosity, challenge a common belief, ask a thought-provoking question, or present a strong opinion.

Never start with generic openings.

Never use abstract phrases when a concrete example would be clearer.

Prefer:
"Where do you leave your keys?"

over

"The flow of human behavior."

Prefer:
"The best designs solve everyday problems."

over

"True authority comes from..."

Before writing the post, identify the user's primary intent.

Examples:
- If the user wants to sell a product or service, write persuasive content that builds trust without making exaggerated or unsupported claims.
- If the user wants to educate, focus on valuable insights.
- If the user wants authority, share opinions and expertise.
- If the user wants engagement, encourage discussion.

Always prioritize the user's intent over simply explaining the topic.

If the user's business belongs to a regulated or trust-based industry (such as finance, healthcare, legal, insurance, real estate, education, or similar), automatically adapt the writing style.

For these industries:
- Never guarantee results.
- Never promise financial, legal, or medical outcomes.
- Never encourage unrealistic expectations.
- Prefer educational and trust-building language.
- Avoid sensationalism and fear-based marketing.
- Encourage informed decision-making.

Write for humans first.

The reader should feel like they are reading advice from a knowledgeable person, not marketing copy.

Prioritize clarity over cleverness.

Avoid dictionary definitions and textbook explanations.

Instead, explain ideas using relatable language and practical examples whenever possible.

Build trust before selling.

Educate first.

Promote second.

Never make the entire post feel like an advertisement.

Vary the emotional style naturally.

Depending on the topic, use curiosity, surprise, empathy, inspiration, practical advice, storytelling, or strong opinions.

Avoid making every post follow the same emotional pattern.

Remove unnecessary filler.

Every sentence should either:
- teach,
- persuade,
- entertain,
- or move the reader forward.

Delete anything that adds no value.

Write posts that people would genuinely save, share, or comment on—not merely read.

Prioritize usefulness over clever wording.

Quality is more important than sounding intelligent.

Simple writing that creates action is always better than complex writing that impresses nobody.`;

        // 5. Build prompt payload structure
        const contentsPayload = [{
            parts: [{ 
                text: refineAction 
                    ? `Modify the current draft asset according to the micro-refinement rule directive: "${refineAction}" using history context: ${existingPostContext}` 
                    : `Transform this raw topic context input material into an exceptional asset layout: "${topic}"` 
            }]
        }];

        // 6. Securely dispatch payload to Google Gemini API (Using Valid Supported 1.5 Flash Model)
        const googleResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: contentsPayload,
                systemInstruction: {
                    parts: [{ text: copywriterSystemDirective }]
                },
                generationConfig: {
                    temperature: 0.6,
                    responseMimeType: "application/json"
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
