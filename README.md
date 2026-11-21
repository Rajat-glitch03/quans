# Quans — Humonoid AI workspace

Quans is a multi-tool AI workspace built with static HTML, Tailwind via CDN, browser JavaScript, Firebase client SDKs and Vercel serverless API routes. The product layer organizes focused workflows; the configured AI provider is called by the existing server-side routes.

## Project structure

- `index.html` — product landing page
- `tool.html` — tool directory
- `resume.html` — AI Resume Builder & Career Toolkit (reuses the existing `/api/chat` route and Firebase chat history)
- `social.html` — Post Studio (existing `/api/social` integration)
- `proposal.html` — Proposal Generator (existing `/api/proposal` integration)
- `textrep.html` — Text Repurposer (existing `/api/textrep` integration)
- `contact.html`, `about.html` — product and support pages
- `assets/css/site-ui.css` — shared visual system and responsive page styling
- `assets/js/site-ui.js` — small shared navigation/reveal enhancements
- `api/` — existing Vercel serverless API handlers

## Run locally

This is not a bundled TypeScript application. It has no `package.json`, TypeScript compiler or frontend build step in the supplied project. For local testing, serve the project root with any static file server that supports the `/api` routes, or use the Vercel development server after installing the Vercel CLI in your development environment. Opening HTML files directly with `file://` will not exercise serverless API routes or Firebase auth redirects correctly.

## Deployment notes

Deploy the project root to Vercel. Keep the existing server-side environment variables configured in the Vercel project settings. Do not move provider secrets into browser JavaScript or commit local `.env` files. The API handlers in `api/` are intentionally kept unchanged in this UI update.

## Resume Builder

The career form turns the supplied details into a structured prompt and sends it through the existing chat workflow. Saved conversations continue to use the same signed-in user's existing Firestore `users/{uid}/chats` collection. Review all generated personal details, dates, qualifications and claims before using a draft.
