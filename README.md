# Quans — Humonoid AI Workspace

A static multi-page front end with TypeScript-powered browser scripts and existing Vercel serverless API routes.

## Project layout

```text
api/                    Existing Vercel API functions (kept unchanged)
assets/
  css/quans-brand.css   Shared visual system
  js/                  Compiled browser JavaScript (build output)
public/                 Unchanged legal/about/pricing/explore pages and legacy URL redirects
src/
  auth/site-auth.ts     Firebase email/Google auth UI and account settings
  pages/                TypeScript for each tool workspace
  main.ts               Shared navigation, icons and UI behavior
scripts/                Build and clean scripts
*.html                  Public page entry points
```

## Local setup

1. Install Node.js 20+ and npm.
2. Run `npm install`.
3. Run `npm run typecheck` to check the TypeScript sources.
4. Run `npm run build` to compile TypeScript into `assets/js/` and create the deployable `dist/` directory.
5. Serve the project with a local static server that supports the `/api/*` routes, or deploy to Vercel to test Firebase and API workflows.

## Deploying on Vercel

- Build command: `npm run build`
- Output directory: `dist`
- Keep the root `api/` directory in the repository. Vercel uses those files as serverless functions.
- Configure the existing `GEMINI_API_KEY` in Vercel Environment Variables. Keep private provider keys server-side; do not place them in browser code.

## TypeScript migration note

The inline browser scripts have been moved into `.ts` source files and compile into `assets/js/`. The shared UI module (`src/main.ts`) is strict type-checked. The pre-existing DOM/Firebase-heavy authentication and tool workflows retain a `@ts-nocheck` compatibility annotation for this first migration so their established runtime behavior is not rewritten at the same time as the UI. These files are now TypeScript source and can be progressively given stronger types as a separate, testable task.

## Existing integrations

The existing `/api/chat`, `/api/proposal`, `/api/social`, and `/api/textrep` routes and their request contracts are preserved. Firebase authentication and Firestore persistence continue to use the existing project configuration and collections. The Resume Builder reuses the existing chat route and signed-in chat history; it does not introduce a new backend route or data store.

## Notes

- `about.html`, `privacypolicy.html`, `termscondn.html`, `pricing.html`, and `explore.html` are copied from the original project without content edits.
- The footer markup is retained from the original public pages.
- The legacy paths (`ai.html`, `tool.html`, `social.html`, `proposal.html`, and `textrep.html`) redirect to their clearer new page names.
- The app uses a pinned Lucide CDN release and the existing Firebase CDN imports.
