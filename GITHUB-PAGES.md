# GitHub Pages Deployment Guide

## Your App is Deployed! 🎉

Your Angular app has been successfully built and pushed to the `gh-pages` branch.

## How to Enable GitHub Pages

1. Go to your repository: https://github.com/yashdive/snapclass-rubrics
2. Click on **Settings** tab
3. In the left sidebar, click **Pages**
4. Under "Build and deployment":
   - **Source**: Select "Deploy from a branch"
   - **Branch**: Select `gh-pages` and `/ (root)`
5. Click **Save**

## Your App URL

Once GitHub Pages is enabled, your app will be available at:
**https://yashdive.github.io/snapclass-rubrics/**

Note: It may take a few minutes for the site to become available after enabling GitHub Pages.

## Future Deployments

To deploy updates to your app:

```bash
# Navigate to client directory
cd snapclass-rubrics-generator/client

# Build the production version
npm run build:prod

# Deploy to GitHub Pages
npx angular-cli-ghpages --dir=dist/client-angular/browser
```

Or use the deploy script:
```bash
npm run deploy
```

## Important Notes

- The app is configured with base href `/snapclass-rubrics/` to work with GitHub Pages
- Static files only - the backend API (`server/`) is NOT hosted on GitHub Pages
- You'll need to deploy the backend separately (e.g., Heroku, Railway, Render, etc.)
- For now, the frontend will work but API calls will fail until you host the backend

## Backend Deployment Options

Since GitHub Pages only hosts static files, you'll need to deploy your backend API separately:

### Recommended Options:
1. **Railway.app** - Easy Node.js hosting, free tier available
2. **Render.com** - Free tier for backend services
3. **Heroku** - Classic option with free tier
4. **Vercel** - Great for Node.js serverless functions

After deploying the backend, update the API URL in:
- `client/src/environments/environment.ts` (production)
