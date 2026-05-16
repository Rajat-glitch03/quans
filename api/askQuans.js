import { GoogleGenAI } from "@google/genai";

export default async function handler(request) {
    // 1. Handle CORS Preflight requests
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type'
            }
        });
    }

    // 2. Only allow POST requests
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method protocol rejected.' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' }
        });
    }

    try {
        const { prompt } = await request.json();
        
        if (!prompt) {
            return new Response(JSON.stringify({ error: 'Prompt layer is missing.' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: 'API Key missing on Vercel environment configurations.' }), {
                status: 500,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Initialize the Gemini client wrapper
        const ai = new GoogleGenAI({ apiKey: apiKey });

        // Trigger Gemini API Request
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: "You are Quans Intelligence, a highly professional cybernetic terminal framework. Keep your answers brief, clean, and highly technical."
            }
        });

        // Return payload securely
        return new Response(JSON.stringify({ answer: response.text }), {
            status: 200,
            headers: { 
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*'
            }
        });

    } catch (error) {
        console.error("Vercel Execution Runtime Exception:", error);
        return new Response(JSON.stringify({ error: 'Matrix exception: ' + error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
