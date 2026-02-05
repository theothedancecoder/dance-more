# Vercel Deployment Fix

## 🚨 PROBLEM:
Vercel deployment is failing with:
```
Error: No Next.js version detected. Make sure your package.json has "next" in either "dependencies" or "devDependencies". Also check your Root Directory setting matches the directory of your package.json file.
```

## ✅ SOLUTION:

### Option 1: Fix Vercel Dashboard Settings (RECOMMENDED - 2 minutes)

1. **Go to Vercel Dashboard:**
   - Visit: https://vercel.com/your-project/settings

2. **Update Root Directory:**
   - Go to: Settings → General → Root Directory
   - Change from: `.` (root)
   - Change to: `dance-school-cms`
   - Click "Save"

3. **Redeploy:**
   - Go to: Deployments tab
   - Click "Redeploy" on the latest deployment
   - Or push a new commit to trigger deployment

### Option 2: Use Vercel CLI (Alternative - 5 minutes)

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project
vercel link

# Deploy
vercel --prod
```

### Option 3: Manual Deployment via Vercel CLI from Subdirectory

```bash
# Navigate to the Next.js app directory
cd dance-school-cms

# Deploy from this directory
vercel --prod
```

---

## 🔍 VERIFICATION:

After deployment succeeds, verify:

1. **Check deployment status:**
   - Go to: https://vercel.com/your-project/deployments
   - Latest deployment should show "Ready" ✅

2. **Test the live site:**
   - Visit: https://your-production-url.com/[tenant-slug]/subscriptions
   - Sign in as a student
   - **Look for "Missing Pass?" button** - if you see it, deployment worked!

3. **Test webhook endpoint:**
   ```bash
   curl -I https://your-production-url.com/api/stripe/webhook
   # Should return 200 or 405 (not 404)
   ```

---

## 📋 WHAT GETS DEPLOYED:

Once Vercel deployment succeeds, these improvements will be live:

### Webhook Improvements:
✅ Retry mechanism (3 attempts with exponential backoff)
✅ Enhanced idempotency checks
✅ Comprehensive error logging to Sanity
✅ Performance monitoring

### User Features:
✅ "Missing Pass?" button on subscriptions page
✅ Real-time status checking after purchase
✅ Automatic sync on page load
✅ Manual sync functionality

### Backend:
✅ `/api/user/subscription-status` - Status checking endpoint
✅ `/api/user/sync-subscriptions` - Manual sync endpoint
✅ `/api/stripe/webhook` - Enhanced webhook handler
✅ Webhook logging schema in Sanity

---

## 🎯 AFTER SUCCESSFUL DEPLOYMENT:

### Immediate Actions:

1. **Recover Siri Lund's Pass:**
   ```bash
   cd dance-school-cms
   
   # Update .env.local with LIVE Stripe keys
   # Then run:
   node recover-siri-lund-pass.mjs
   ```

2. **Check for Other Affected Students:**
   ```bash
   node diagnose-student-issue.mjs
   ```

3. **Recover All Missing Passes:**
   ```bash
   node recover-all-missing-passes.mjs
   ```

### Notify Students:
```
Subject: Your Dance Pass is Ready!

Hi [Student Name],

We've resolved the issue with your recent pass purchase. Your pass is now active!

View your pass: [Your School URL]/subscriptions

If you don't see it immediately:
1. Refresh your browser
2. Click the "Missing Pass?" button on the page

Happy dancing!
```

---

## 🐛 TROUBLESHOOTING:

### If deployment still fails:

1. **Check package.json location:**
   ```bash
   ls -la dance-school-cms/package.json
   # Should exist
   ```

2. **Verify Next.js is in dependencies:**
   ```bash
   cd dance-school-cms
   cat package.json | grep "next"
   # Should show: "next": "15.3.4" or similar
   ```

3. **Check Vercel project settings:**
   - Framework Preset: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
   - Install Command: `npm install`
   - Root Directory: `dance-school-cms`

### If "Missing Pass?" button doesn't appear:

1. **Clear browser cache**
2. **Hard refresh:** Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
3. **Check browser console for errors**
4. **Verify you're on the correct page:** `/subscriptions` not `/subscription`

---

## 📞 QUICK REFERENCE:

**Vercel Dashboard:** https://vercel.com/dashboard
**Deployment Logs:** https://vercel.com/your-project/deployments
**Root Directory Setting:** Settings → General → Root Directory → `dance-school-cms`

---

---

## ✅ SOLUTION IMPLEMENTED:

### vercel.json Configuration Updated

The `vercel.json` file has been updated to include the `rootDirectory` setting:

```json
{
  "buildCommand": "npm run build",
  "devCommand": "npm run dev", 
  "installCommand": "npm install",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "rootDirectory": "dance-school-cms"
}
```

### Next Steps:

1. **Commit and push the changes:**
   ```bash
   git add vercel.json
   git commit -m "Fix: Add rootDirectory to vercel.json for deployment"
   git push origin main
   ```

2. **Vercel will automatically deploy** when you push to the main branch

3. **Monitor the deployment:**
   - Go to: https://vercel.com/dashboard
   - Check the deployment logs
   - Verify Next.js 15.3.4 is detected

**Status:** ✅ FIXED - vercel.json updated with rootDirectory
**Priority:** HIGH - Ready for deployment
**Action Required:** Commit and push changes to trigger deployment
