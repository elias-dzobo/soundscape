# Deployment Guide for Soundscape Brantford

This guide covers the easiest ways to deploy your Vite + React app.

## 🚀 Option 1: Vercel (Recommended - Easiest)

Vercel is the easiest option with zero configuration needed.

### Steps:

1. **Push your code to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

2. **Deploy to Vercel**
   - Go to [vercel.com](https://vercel.com) and sign up/login
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Vite
     - **Build Command**: `bun run build` (or `npm run build`)
     - **Output Directory**: `dist`
     - **Install Command**: `bun install` (or `npm install`)

3. **Set Environment Variable**
   - In Vercel project settings → Environment Variables
   - Add: `GEMINI_API_KEY` = `your-api-key-here`
   - Make sure it's set for **Production**, **Preview**, and **Development**

4. **Deploy**
   - Click "Deploy"
   - Your app will be live at `https://your-project.vercel.app`

### Vercel CLI (Alternative)
```bash
bun add -g vercel
vercel login
vercel
# Follow prompts, set GEMINI_API_KEY when asked
```

---

## 🌐 Option 2: Netlify

### Steps:

1. **Push to GitHub** (same as above)

2. **Deploy to Netlify**
   - Go to [netlify.com](https://netlify.com) and sign up/login
   - Click "Add new site" → "Import an existing project"
   - Connect your GitHub repository
   - Configure:
     - **Build command**: `bun run build`
     - **Publish directory**: `dist`
     - **Base directory**: (leave empty)

3. **Set Environment Variable**
   - Go to Site settings → Environment variables
   - Add: `GEMINI_API_KEY` = `your-api-key-here`

4. **Deploy**
   - Click "Deploy site"
   - Your app will be live at `https://your-project.netlify.app`

### Netlify CLI (Alternative)
```bash
bun add -g netlify-cli
netlify login
netlify deploy --prod
# Set GEMINI_API_KEY in Netlify dashboard
```

---

## ⚡ Option 3: Cloudflare Pages

### Steps:

1. **Push to GitHub**

2. **Deploy to Cloudflare Pages**
   - Go to [dash.cloudflare.com](https://dash.cloudflare.com) → Pages
   - Click "Create a project" → "Connect to Git"
   - Select your repository
   - Configure:
     - **Framework preset**: Vite
     - **Build command**: `bun run build`
     - **Build output directory**: `dist`

3. **Set Environment Variable**
   - Go to Settings → Environment variables
   - Add: `GEMINI_API_KEY` = `your-api-key-here`

4. **Deploy**
   - Click "Save and Deploy"
   - Your app will be live at `https://your-project.pages.dev`

---

## 🔧 Option 4: GitHub Pages (Free but Manual)

1. **Install gh-pages**
   ```bash
   bun add -D gh-pages
   ```

2. **Update package.json**
   ```json
   "scripts": {
     "predeploy": "bun run build",
     "deploy": "gh-pages -d dist"
   }
   ```

3. **Deploy**
   ```bash
   bun run deploy
   ```

4. **Enable GitHub Pages**
   - Go to repo Settings → Pages
   - Source: `gh-pages` branch
   - Note: API keys will be exposed in the build (not recommended for production)

---

## ⚠️ Important Notes

### Environment Variables
- **Never commit your API key** to Git
- Always set `GEMINI_API_KEY` in your deployment platform's environment variables
- The build process will inline the key at build time (see `vite.config.ts`)

### Build Configuration
Your `vite.config.ts` already handles environment variables correctly:
- It reads `GEMINI_API_KEY` from environment
- Inlines it as `process.env.API_KEY` and `process.env.GEMINI_API_KEY` in the build

### Testing Locally Before Deploy
```bash
# Create .env.local file
echo "GEMINI_API_KEY=your-key-here" > .env.local

# Build and test
bun run build
bun run preview
```

---

## 🎯 Quick Comparison

| Platform | Ease | Free Tier | Auto Deploy | Best For |
|----------|------|-----------|-------------|----------|
| **Vercel** | ⭐⭐⭐⭐⭐ | ✅ Generous | ✅ Yes | **Recommended** |
| **Netlify** | ⭐⭐⭐⭐ | ✅ Generous | ✅ Yes | Good alternative |
| **Cloudflare Pages** | ⭐⭐⭐⭐ | ✅ Unlimited | ✅ Yes | High performance |
| **GitHub Pages** | ⭐⭐⭐ | ✅ Free | ❌ Manual | Static sites only |

---

## 🐛 Troubleshooting

### Build Fails
- Check that `GEMINI_API_KEY` is set in environment variables
- Verify build command: `bun run build` (or `npm run build`)

### API Key Not Working
- Ensure the key is set in the deployment platform's environment variables
- Rebuild/redeploy after adding the variable
- Check browser console for errors

### Microphone Permissions
- HTTPS is required for microphone access
- All platforms above provide HTTPS automatically

---

## 📝 Recommended: Vercel

For this project, **Vercel is the easiest**:
- Zero configuration needed
- Automatic HTTPS
- Free tier is generous
- Instant deployments on git push
- Great for React/Vite apps

Just push to GitHub, connect to Vercel, set the environment variable, and deploy!

