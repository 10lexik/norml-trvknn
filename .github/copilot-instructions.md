<!-- Copilot Instructions for norml-trv (NORML Academy Quiz) -->

# Repository orientation for AI coding agents

This project is a small Vue 3 + TypeScript single-page app (Vite) with a couple of Vercel serverless endpoints that read from a MongoDB collection named `trivia`.

- **Entry points & infra:** `npm run dev` (Vite), `npm run start` (uses `vercel dev`), `npm run build` and `npm run deploy` (Vercel). See `package.json` for scripts.
- **Frontend:** `src/` — Vue 3 (Composition API), TypeScript, single-file components (`<script setup lang="ts">`). Key components: `src/components/Quizz.vue` (game logic/UI), `App.vue`, `main.ts` (bootstraps i18n).
- **i18n / content:** `src/plugins/i18n.ts` wires `src/locales/{fr,en,es}.json`. These JSON files are primarily UI translations; the server (Mongo) is the source of truth for question correctness and explanations.
- **API / backend:** `api/start_game.ts` and `api/check_answer.ts` — Vercel Serverless functions. They rely on `process.env.MONGODB_URI` and the MongoDB collection named `trivia`.

Important patterns and conventions (use these exactly):

- Questions flow: frontend calls `/api/start_game?lang=<fr|en|es>&level=<easy|medium|hard>` which returns an array of question objects with `_id` encoded as `<lang>_<level>_<index>` (example: `fr_easy_12`). The frontend then calls `/api/check_answer` (POST JSON `{ questionId, userIndex }`). The server decodes the `_id` to locate the authoritative question and returns `{ correct, correctIndex, explanation }`.
- DB structure: the single document in `trivia` is organized by language keys (e.g., `data.fr`), then `questions_pool`, then levels (`easy`,`medium`,`hard`) which are arrays. follow the exact navigation used in `api/check_answer.ts`.
- Mongo client pattern: serverless functions use a cached `global._mongoClientPromise` to reuse connections — preserve this pattern if you modify APIs.
- Local leaderboard: frontend stores saved scores in `localStorage` under key `norml_quiz_scores` (see `src/components/Quizz.vue`). Do not replace with server-side storage without updating UI/UX expectations.

Developer workflows & commands:

- Start dev server (frontend + Vite hot reload): `npm run dev` (default Vite port 5173).
- Run local serverless functions with Vercel emulation: `npm run start` (requires `vercel` and `MONGODB_URI` env var set locally or in Vercel dashboard).
- Build for production: `npm run build` (runs `vue-tsc -b` then `vite build`). Deploy with `npm run deploy` (Vercel CLI).
- Lint & format: `npm run lint` and `npm run format`.

When editing code, follow these repo-specific tips:

- Keep UI translation changes in `src/locales/*.json`. To add a language, update `src/plugins/i18n.ts` `messages` and add the JSON file. The app reads these at startup via `setLocaleMessage` in `Quizz.vue`.
- When changing question data shape or API contract, update both `api/*.ts` and `src/components/Quizz.vue` — the frontend expects `options` (string[]), plus `correct` and `explanation` returned by `/api/check_answer`.
- Preserve the ID encoding/decoding format (`<lang>_<level>_<index>`). Tests or client calls rely on this exact format.
- Error codes: the API returns `404` for missing data and `500` for server errors — preserve these semantics where possible so the frontend error handling remains accurate.

Files to inspect for examples:

- `api/start_game.ts` — how questions are pulled, filtered, and `_id` is generated.
- `api/check_answer.ts` — how the server decodes `questionId` and returns `correctIndex` and `explanation`.
- `src/components/Quizz.vue` — entire game flow (start, selectAnswer, nextQuestion), localStorage usage, UI state names (`gameState`), and how i18n is used.
- `src/plugins/i18n.ts` — locale bootstrap and default locale logic.

Environment variables / deployment notes:

- `MONGODB_URI` must be set in local env or Vercel project settings for APIs to work. Without it, `start_game` and `check_answer` will fail.
- The code uses `@vercel/node` types and `vercel dev` for local emulation; the deployed functions run as Vercel Serverless functions.

If you (agent) need to change behavior or add features, prefer small, isolated PRs that update: API contract (api/_.ts) → frontend consumer (Quizz.vue) → locale strings (locales/_.json). Ask if unknown: "Should server or client be treated as source of truth for X?" before large refactors.

If something is unclear, ask the maintainer to point to the authoritative question dataset (Mongo document) or provide a sample document from the `trivia` collection.

— End of instructions —
