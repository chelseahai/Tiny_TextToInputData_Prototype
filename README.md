# Tiny_TextToInputData_Prototype

A Next.js application that converts natural language descriptions into garment parameters with 3D visualization.

## ⚠️ Important: API Routes Limitation

**This app uses Next.js API routes (`/api/analyze`) which require a server.** GitHub Pages only serves static files and cannot run server-side code.

### Option 1: Deploy to Vercel (Recommended)

Vercel supports Next.js API routes natively and is the easiest deployment option:

1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com) and import your repository
3. Add your `OPENAI_API_KEY` in the environment variables
4. Deploy!

### Option 2: Deploy to GitHub Pages (Client-Side API)

The app now supports client-side API calls as a fallback for GitHub Pages. **⚠️ Warning: This exposes your API key in the browser.**

**Setup Steps:**

1. **Set your OpenAI API key as an environment variable:**
   - Create a `.env.local` file (for local testing) or set it in GitHub Actions secrets
   - Add: `NEXT_PUBLIC_OPENAI_API_KEY=your-api-key-here`
   - ⚠️ **Security Warning**: `NEXT_PUBLIC_` variables are exposed to the browser. Never commit your API key to the repository!

2. **For GitHub Actions deployment:**
   - Go to your repository → Settings → Secrets and variables → Actions
   - Add a new secret: `NEXT_PUBLIC_OPENAI_API_KEY` with your OpenAI API key
   - Update `.github/workflows/deploy.yml` to pass this as an environment variable to the build step

3. **Enable GitHub Pages:**
   - Go to Settings → Pages
   - Source: GitHub Actions

4. **Push to `main` branch** - The workflow will automatically build and deploy

**How it works:**
- The app first tries to use the server-side API route (`/api/analyze`)
- If that fails (like on GitHub Pages), it automatically falls back to client-side API calls
- This allows the same codebase to work on both Vercel (with API routes) and GitHub Pages (with client-side calls)

## Local Development

```bash
npm install
npm run dev
```

The app will be available at `http://localhost:5500`

## Build for Production

```bash
npm run build
```

For GitHub Pages, the build output will be in the `out` directory.
