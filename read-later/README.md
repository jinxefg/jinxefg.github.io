# Later — read-it-later app

A small read-later app: save a URL or a clipped block of text, and Claude
automatically titles, categorizes, and summarizes it.

## What was fixed from the original snippet

The file you uploaded was an artifact-style single component, and had a
few issues that would break it outside of Claude.ai:

1. **Direct browser → Anthropic API call.** The original `processWithAI`
   called `api.anthropic.com` straight from the client with no API key.
   That only works inside Claude.ai's sandboxed artifact preview, which
   proxies the request for you. On a real deployment this would fail
   (no key → 401, and the browser would also be blocked by CORS even with
   one). Fixed by moving the call into `api/process.js`, a Vercel
   serverless function that holds the key server-side. The frontend now
   calls `fetch("/api/process", ...)` instead.
2. **Truncated source file.** The upload was missing a chunk (the body of
   the `Reader` view and the start of the `Card` component) — looks like
   a placeholder line literally saying "truncated lines 188-245" had
   ended up pasted into the file. I rebuilt that section (article body,
   "Open original" / "Share" buttons, the `Card` function signature) to
   match the existing design system.
3. **`sessionStorage` → `localStorage`.** Saved items were wiped every
   time the tab closed. Switched to `localStorage` so your list persists
   between visits.
4. **Minor cleanup.** A no-op ternary (`prefillUrl ? "url" : "url"`) in
   `AddModal`, and item `id` generation that could collide if you saved
   twice in the same millisecond.

## Project structure

```
.
├── api/
│   └── process.js     # Serverless function — calls Anthropic, keeps the key secret
├── src/
│   ├── App.jsx         # The app
│   └── main.jsx        # React entry point
├── index.html
├── package.json
└── vite.config.js
```

## Local development

```bash
npm install
```

You need the AI endpoint running too. The easiest way is the Vercel CLI,
which serves both the frontend and `/api` together:

```bash
npm install -g vercel   # one-time
vercel dev
```

Create a `.env` file first (copy `.env.example`) with your real key:

```
ANTHROPIC_API_KEY=sk-ant-...
```

(If you just run `npm run dev` with plain Vite, the page loads but Save &
categorize will fail, since `/api/process` isn't served — `vercel dev` is
what makes that route work locally.)

## Deploying to Vercel

1. Push this folder to a GitHub repo (or run `vercel` from inside it).
2. Import the repo at https://vercel.com/new — it auto-detects Vite, no
   build settings to change.
3. In **Project Settings → Environment Variables**, add:
   - `ANTHROPIC_API_KEY` = your key from https://console.anthropic.com
4. Deploy. `api/process.js` is picked up automatically as a serverless
   function at `/api/process`.

## Notes

- Data is stored in `localStorage`, per-browser. There's no backend
  database, so saved items won't sync across devices.
- The PWA "share target" handling (`?url=`, `?text=`, `?title=` query
  params) is wired up in the code, but actually registering this as an
  installable PWA share target needs a manifest + service worker, which
  isn't included here — happy to add that if you want it.
