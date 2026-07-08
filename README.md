# inert. — deployment guide

Scan any product. See what leaches. Purity scored /100.

## What's in this folder

- `index.html` — the whole app (single file, no build step)
- `api/analyze.js` — a serverless function that keeps your Anthropic API key secret and calls the AI

## Deploy to Vercel (free tier is fine)

**1. Get an Anthropic API key**
- Go to console.anthropic.com → sign up → API Keys → Create Key
- Add a few pounds of credit (each scan costs a fraction of a penny)

**2. Put this folder on GitHub**
- Create a new repo (e.g. `inert-app`) and upload these files, keeping the `api/` folder structure

**3. Deploy**
- Go to vercel.com → Add New Project → Import your repo
- Before hitting Deploy: Settings → Environment Variables → add
  - Name: `ANTHROPIC_API_KEY`
  - Value: your key from step 1
- Deploy. You'll get a live URL like `inert-app.vercel.app`

**4. Test on your phone**
- Open the URL in Safari/Chrome — the live QR radar scanner works here because it's a real site (no sandbox)
- Add to Home Screen and it behaves like an app

## Custom domain (optional)
Vercel → your project → Settings → Domains → add e.g. `inertapp.com` (buy the domain anywhere, point DNS at Vercel).

## Notes
- Never put the API key in index.html — it must stay in the environment variable, used only by api/analyze.js
- Costs scale with use: Claude Sonnet vision calls are roughly £0.005–0.01 per scan depending on image size
- If you later want accounts, scan history, or a barcode product database (Open Food Facts is free), those are natural next steps
