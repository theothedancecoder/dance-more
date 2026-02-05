# Vercel Dashboard Configuration Guide

## The Problem
The `vercel.json` file cannot set the root directory for framework detection. Vercel needs this to be configured in the dashboard settings.

## Solution: Configure in Vercel Dashboard

### Step 1: Go to Project Settings
1. Visit: https://vercel.com/dashboard
2. Select your project: `dance-more`
3. Click on **Settings** tab

### Step 2: Update Root Directory
1. In Settings, go to **General** section
2. Find **Root Directory** setting
3. Click **Edit**
4. Change from: `.` (current root)
5. Change to: `dance-school-cms`
6. Click **Save**

### Step 3: Redeploy
1. Go to **Deployments** tab
2. Click on the latest failed deployment
3. Click **Redeploy** button
4. OR push a new commit to trigger automatic deployment

## What This Does
- Tells Vercel to treat `dance-school-cms` as the project root
- Vercel will look for `package.json` in `dance-school-cms/`
- Next.js will be detected from `dance-school-cms/package.json`
- All build commands run from the `dance-school-cms` directory

## Alternative: Delete vercel.json
Since the dashboard configuration is the proper way to set the root directory, you can optionally delete the `vercel.json` file:

```bash
git rm vercel.json
git commit -m "Remove vercel.json - using dashboard configuration instead"
git push origin main
```

## Verification
After setting the Root Directory in the dashboard and redeploying:
1. Check build logs - should see: "Detected Next.js version: 15.3.4"
2. Build should complete successfully
3. Application should deploy and be accessible

## Important Notes
- The Root Directory setting in the Vercel dashboard is the ONLY way to change where Vercel looks for the framework
- The `vercel.json` file can customize build commands, but cannot change the root directory for framework detection
- This is a Vercel platform limitation, not a configuration error
