# QUANS security setup notes

## What this project now does

- Uses Firebase Authentication as the account system.
- Sends Firebase email-verification links directly at signup; the client-generated EmailJS OTP step has been removed.
- Continues to reject unverified accounts on protected API and credit endpoints.
- Uses the registered reCAPTCHA Enterprise site key with Firebase App Check on pages that call QUANS custom APIs.
- Sends App Check tokens to the custom API routes; the existing server helper verifies them when `QUANS_REQUIRE_APPCHECK=true`.
- Adds Firestore rules that restrict browser access to the signed-in, email-verified user's own `users/{uid}` data and deny browser access to all other collections.
- Leaves the AI generation prompt files under `api/` unchanged.

## Firebase project

The project ID configured in this repository is `quans-175a2`.

## Firestore rules

The rules are in `firestore.rules`. They permit verified users to access only their own documents inside the four history subcollections `users/{uid}/chats`, `generations`, `proposals`, and `repurposings`. They do not permit browser access to the `users/{uid}` root document. The backend uses Firebase Admin SDK, which bypasses Firestore Security Rules. Credit accounts, reservations, ledgers, email claims, account deletion jobs, and other collections are therefore denied to browser clients.

To publish these rules, use the Firebase Console for project `quans-175a2` → Firestore Database → Rules, replace the editor contents with `firestore.rules`, and publish. If using Firebase CLI instead, this repository now includes `firebase.json` and `.firebaserc`; deploy with `firebase deploy --only firestore:rules`.

Before publishing, confirm the project has no additional legitimate browser-accessed collection paths beyond the `users/{uid}` history paths present in this repository. The current repository's browser code accesses only those four history subcollections.

## App Check rollout

The app uses the reCAPTCHA Enterprise site key already present on the QUANS home page. The same key is copied into every page that calls a protected custom API. The SDK token is attached as `X-Firebase-AppCheck`.

The backend already supports enforcement through the Vercel environment variable `QUANS_REQUIRE_APPCHECK`:

1. Deploy the updated website and API files first while `QUANS_REQUIRE_APPCHECK` is unset or `false`.
2. Test signup, Firebase email verification, login, saved history, credit balance, and all four generation APIs.
3. In Firebase Console → App Check, monitor requests for the QUANS web app and confirm valid requests are arriving.
4. Only after the above succeeds, set `QUANS_REQUIRE_APPCHECK=true` in Vercel Production and redeploy. This makes the custom API endpoints reject requests without valid App Check tokens.
5. Separately, enable Firestore enforcement in Firebase App Check only after confirming Firestore metrics show the updated pages sending valid tokens.

Do not enable Firebase Authentication enforcement as part of this rollout unless every page that performs Authentication has been registered and initialized for App Check and the metrics are clean.

## Vercel environment variables

Use `.env.example` as a name checklist. Keep the Firebase service account JSON, Gemini API key, and HMAC key private in Vercel. Do not commit real `.env` files or service-account JSON files.

## Intentionally unchanged

The AI prompt/system-instruction source files `api/chat.js`, `api/proposal.js`, `api/social.js`, and `api/textrep.js` have not been edited. No tool prompt text has been rewritten or optimized.
