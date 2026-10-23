# Alpha AI — Easy deploy guide (no coding needed)

You need three free accounts:
1. **GitHub** — https://github.com/signup  
2. **Netlify** — https://app.netlify.com  
3. An **OpenAI** API key — https://platform.openai.com/api-keys (add a little credit under Billing)

---

## Step A — Put the project on GitHub

1. On your computer, unzip this project so you see folders like `src`, `public`, `package.json`.
2. Open https://github.com → **New repository**  
   - Name: `alpha-ai`  
   - Public is fine  
   - Do **not** add a README (project already has one)
3. Upload files:
   - Easiest: on the new empty repo page, click **uploading an existing file** and drag **all** project files in, then **Commit**.
   - Or use GitHub Desktop if you prefer.

---

## Step B — Connect Netlify

1. Go to https://app.netlify.com and sign up / log in.
2. **Add new site** → **Import an existing project**.
3. Choose **GitHub** and allow access.
4. Select the `alpha-ai` repository.
5. Build settings (should autofill from `netlify.toml`):
   - Build command: `npm run build`
   - Publish directory: `dist/client`
6. Click **Deploy site**. Wait until it finishes (a few minutes).

You will get a link like `https://random-name.netlify.app`.

---

## Step C — Add the AI key (so chat works)

1. In Netlify open your site → **Site configuration** → **Environment variables**.
2. **Add a variable**:

| Name | Value |
|------|--------|
| `OPENAI_API_KEY` | your key from platform.openai.com (starts with `sk-`) |
| `OPENAI_MODEL` | *(optional)* `gpt-4o` is the default. Change this only to a model ID available to your OpenAI API project. |
| `OPENAI_IMAGE_MODEL` | *(optional)* `gpt-image-1` for Image Studio; ensure your API project has access and billing enabled. |

If you used Grok before, **delete** the old `AI_API_KEY`, `AI_BASE_URL` and `AI_MODEL` variables — they are no longer used.

3. Save variables.
4. **Deploys** → **Trigger deploy** → **Deploy site** (required after adding keys).

---

## Step D — Check it works

1. Open your Netlify URL.
2. Create account or **Continue as guest**.
3. Finish personalization.
4. Send: `Hello Alpha`.
5. Preferences → Tutor service should say connected.

---

## Sign-in page

Open: `https://YOUR-SITE.netlify.app/sign-in`

- Create account / Sign in (saved on that device’s browser)
- Or continue as guest

---

## UNEB news

The bell icon loads notices from **uneb.ac.ug** (and links to NCDC / MoES).  
If the live fetch fails, official links still appear.

---

## Common problems

| Problem | Fix |
|---------|-----|
| Chat says backend not configured | `OPENAI_API_KEY` missing → add it → **redeploy** |
| Chat says out of credit / model not found | Add credit on platform.openai.com, or check `OPENAI_MODEL` spelling |
| Build failed on Netlify | Open deploy log; usually missing `package-lock` is fine — ensure Node 22 |
| News empty | Site may block servers; fallback official links still show |
| Want a custom domain | Netlify → Domain management → Add domain |

You do **not** need to run Python or Terminal on your PC for this path.


## Image Studio and Canvas

- Image generation uses `POST /api/images` and returns a PNG for preview/download. Set `OPENAI_IMAGE_MODEL` only to an image model available to your API project.
- Canvas writing actions use `POST /api/canvas` and `OPENAI_MODEL`. The key remains server-side.
- Canvas draft text and attached generated images are saved in browser IndexedDB on that device. They are not synced to an account or cloud database.
- HTML export embeds attached PNGs so the downloaded file can be opened offline. Markdown and plain-text exports include image references/notes; use HTML export when you need a self-contained document with images.
- Both new AI endpoints use best-effort per-instance rate limits only. Before public launch, use authenticated quotas and a shared rate limiter.
