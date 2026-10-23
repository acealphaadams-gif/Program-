# Alpha AI — Your Friendly Tutor

AI tutoring for Ugandan learners and teachers (NCDC competence-based curriculum, UNEB exams), plus a coding mode and a world-language translator. Runs as a web app on phone or desktop.

> **Source note:** the original `alpha-netlify.zip` was never attached to this project. This codebase is a rebuild from the written brief, not a migration of those files.

## What's in it

- **Onboarding** — floating logo, then preferred name, role (Learner / Teacher), study level, learning preferences. Returning users go straight to their latest chat.
- **Tutor mode** — step-by-step explanations with LaTeX maths (KaTeX), optional Socratic hint-by-hint mode, different voice for teachers vs learners.
- **Coding mode** — writes complete code in any language, with copy / download / in-browser run for HTML and JavaScript snippets.
- **Translate mode** — any world language in or out, including Luganda, Runyankole, Acholi, Lusoga, Ateso, Lugbara, Swahili, Kinyarwanda. Low-resource languages are flagged as possibly imperfect rather than presented as exact.
- **Offline AI (optional download)** — Preferences → Offline AI downloads a small on-device model (about 1 GB). Chat then answers with no internet. Needs WebGPU (recent Chrome / Edge on a newer computer or Android phone); the app itself still needs internet the first time it opens.
- **Chat sessions** — new chat, rename, delete, search-free sidebar list, persisted locally.
- **Attachments** — PNG / JPG / WEBP / GIF (magic-byte checked) and TXT / MD / CSV, max 4 MB. PDFs are not supported; upload a photo or screenshot of the page instead.
- **Voice** — dictation and read-aloud where the browser supports it, with a clear "not supported here" message where it doesn't.
- **Notifications, preferences, theme** — all live controls; anything unavailable is shown disabled with a reason.
- **Image Studio** — generate original PNG illustrations with the configured OpenAI image model, preview them, download them, or attach the actual image to Canvas.
- **Alpha Canvas** — edit, preview, autosave drafts in browser IndexedDB, attach generated images, ask Alpha to improve/proofread/simplify/expand/summarize/outline a draft, then download Markdown, text, or HTML with embedded images.
- **Honest states** — backend health check at `/api/health`, distinct errors for missing key / no credits / rate limits, and a warning when browser storage is full or blocked.

## Run locally

```sh
npm install          # or: bun install
cp .env.example .env # then put a key in it
npm run dev          # http://localhost:8080
```

## Backend configuration

The chat is answered by your server, not the browser. The routes `/api/chat`, `/api/canvas`, and `/api/images` read these variables at runtime:

| Variable | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Required. Your key from https://platform.openai.com/api-keys. The tutor talks to the official OpenAI API. |
| `OPENAI_MODEL` | Optional. Default `gpt-4o`. Set this to another model ID available to your OpenAI API project if needed. |
| `OPENAI_IMAGE_MODEL` | Optional. Default `gpt-image-1`; used only by the Image Studio. |
| `MAX_OUTPUT_TOKENS` | Optional. Default `1400`; keeps tutor responses focused. |

With no key at all the app still opens and explains that the tutor backend is not configured — it never pretends to answer.

The key is read only inside server code and is never shipped to the browser.

## Build and host it yourself

```sh
npm run build
```

The default build targets Cloudflare Workers (that is what Lovable deploys). To run it on your own machine or VPS with Node:

```sh
NITRO_PRESET=node-server npm run build
node .output/server/index.mjs     # serve .output/public behind it, or let it serve everything
```

The host must run server code, because `/api/chat`, `/api/canvas`, `/api/images`, and `/api/health` are server routes.

### Netlify (ready to go)

`netlify.toml` and `netlify/functions/server.mjs` are included. The normal `npm run build` output is served by Netlify's CDN (`dist/client`) and the server (pages, `/api/chat`, `/api/canvas`, `/api/images`, `/api/health`) runs as one Netlify Function.

1. Push this folder to GitHub/GitLab and "Import an existing project" in Netlify (or run `npx netlify deploy --build --prod` with the Netlify CLI).
2. In **Site settings → Environment variables** add `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`).
3. Redeploy. Preferences → "Tutor service" should say "Connected and configured."

Streaming answers work on Netlify Functions; very long replies may hit Netlify's function time limit on the free plan.

**Netlify drag-and-drop (static only) cannot run the tutor** — use the Git/CLI deploy above.

### Offline AI

Preferences → Offline AI downloads a small model (~1 GB, WebGPU browsers only) into the browser. Once loaded, Alpha switches to it automatically when the device loses internet or the server is unreachable, and you can force it with "Prefer offline AI". It is much weaker than the online tutor and cannot read images; the app itself must already be open (no installed offline shell).

## Things to know before you deploy

- **No accounts.** Profile, preferences and chat history live in that browser's `localStorage` only — nothing syncs between devices, and clearing browser data clears the chats.
- **Chat attachments are not kept** in saved history (to stay inside storage limits). Generated Image Studio images can be saved explicitly to Canvas using IndexedDB, downloaded as PNG, and embedded into exported HTML. Browser storage is device-local, so download important work as a backup.
- **Image and Canvas AI use paid API calls.** Image generation has a best-effort per-instance rate limit; before public launch, add authenticated accounts, shared/distributed quotas, and abuse monitoring. Canvas AI also has a best-effort per-instance request limit.
- **The offline model is much weaker** than the online tutor: it is a 1.5B parameter model, can't see attached images, and only runs on WebGPU devices. It is a fallback, not a replacement.
- **No live UNEB / NCDC news.** The tutor has no feed of exam dates, results or announcements and is instructed to send users to uneb.ac.ug, ncdc.go.ug, education.go.ug instead of guessing.
- **No payments** of any kind are implemented.
- **Translation quality varies** — strong for well-resourced languages, honest-but-imperfect for many local ones.

## Checks

```sh
npm run test     # vitest
npx tsgo --noEmit   # or npx tsc --noEmit
npm run lint
```

## Layout

```
src/routes/          pages + /api/chat, /api/canvas, /api/images, /api/health server routes
src/components/alpha/  the app's own UI (logo, onboarding, chat, sidebar, settings, Image Studio, Canvas…)
src/components/ui/     shadcn-style primitives
src/lib/ai/         prompt builder (shared) + server-side model call
src/lib/alpha/      storage, profile, sessions, voice, offline model, notices
src/test/           tests
```

## Meetings (online collaboration)

Sidebar → **Meetings**: schedule student discussions, teacher meetings, lessons or parent meetings, copy the link, and join video calls inside the app. Calls run on the free public Jitsi Meet service (meet.jit.si); anyone with the link can join. Meeting lists are saved in the browser only.

## Upload size

The app accepts files up to 4 MB by default. The server limit is set by `MAX_UPLOAD_MB` (default 4) and chat history length by `MAX_MESSAGES` (default 200). This conservative limit is intended to fit typical serverless request limits:
- **Netlify Functions: hard 6 MB request limit** — base64-encoded attachments increase request size, so large uploads will fail there. Use a Node server/VPS and raise `MAX_UPLOAD_MB` only when you need larger uploads.
- **Node server / VPS:** no limit except your reverse proxy (nginx: `client_max_body_size 150m;` (raise `MAX_UPLOAD_MB` in the server environment too)).
- The AI model itself also has a size limit per file (roughly 20–50 MB for PDFs, depending on the provider).

## Step-by-step backend deploy (VPS / Node, recommended for big uploads)

1. Get a Linux server (Ubuntu 22+), install Node 22: `curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash - && sudo apt install -y nodejs nginx`.
2. Upload and unzip this folder, then: `npm install`.
3. Create `.env` from `.env.example` with `OPENAI_API_KEY=...` (and optionally `OPENAI_MODEL`).
4. Build: `NITRO_PRESET=node-server npm run build`.
5. Run it permanently: `npm i -g pm2 && pm2 start .output/server/index.mjs --name alpha && pm2 save && pm2 startup`. It listens on port 3000 (`PORT=` to change).
6. nginx: proxy your domain to `http://127.0.0.1:3000`, set `client_max_body_size 150m;` and `proxy_buffering off;` (needed for streamed answers).
7. HTTPS: `sudo apt install certbot python3-certbot-nginx && sudo certbot --nginx -d yourdomain.com` (microphone, camera and meetings need HTTPS).
8. Open the site → Preferences → "Tutor service" should say connected.

## Image generation and Alpha Canvas

- **Image Studio** is available from the chat header. It sends prompts to the server route `/api/images`, which calls the OpenAI Images API using `OPENAI_API_KEY`. The default image model is `gpt-image-1`; optionally set `OPENAI_IMAGE_MODEL` to an image model available to your API project. Generated PNGs can be downloaded directly from the preview.
- **Alpha Canvas** is an editable local workspace for drafts, notes, lesson plans and reports. Save stores the draft in this browser's local storage; Download exports Markdown, plain text, or HTML. It does not sync to the cloud unless a future authenticated sync service is configured.
- Assistant answers can be downloaded as Markdown or opened in Canvas. Code blocks keep their separate copy/download controls.
- Image generation may incur separate API charges. The API key remains server-side. Before public launch, add authenticated usage limits and per-user rate limiting to `/api/images` to prevent abuse and unexpected costs.

## Learning Workspace

The `/learning-workspace` route includes a cyan/turquoise study dashboard, checklist-based study plan, locally saved notes with Markdown export, editable flashcards with JSON export, a short session-only study-skills quiz, and resource shortcuts that hand prompts to the existing tutor chat. Goals, notes, and flashcards are stored in the current browser; cloud sync and persistent subject-mastery analytics are not included. See `FINAL-BUILD-NOTES.txt` for scope and validation status.
