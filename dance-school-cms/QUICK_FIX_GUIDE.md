# Quick Fix Guide - Missing Passes Issue

## 🚨 IMMEDIATE ACTION (5 minutes)

### Step 1: Diagnose the Problem
```bash
cd dance-school-cms
node diagnose-missing-passes.mjs
```

This will show you:
- How many students are affected
- Their names and emails
- Which passes they purchased

### Step 2: Fix All Missing Passes
```bash
node recover-all-missing-passes.mjs
```

This will:
- Automatically create subscriptions for all affected students
- Show you a summary of what was fixed
- List any errors that need manual attention

### Step 3: Notify Students
Send them this message:

```
Hi [Name],

Good news! Your [Pass Name] is now active and ready to use.

You can view it here: [Your School URL]/subscriptions

If you don't see it immediately:
1. Refresh your browser (Ctrl+R or Cmd+R)
2. Or click the "Missing Pass?" button on the page

Happy dancing!
```

---

## 🔍 VERIFICATION (2 minutes)

### Check if fixes are deployed:
```bash
# Check webhook improvements
curl -I https://your-production-url.com/api/stripe/webhook

# Check manual sync endpoint
curl -I https://your-production-url.com/api/user/sync-subscriptions
```

If you get 404 errors, the fixes aren't deployed yet.

---

## 🚀 DEPLOY FIXES (if needed - 10 minutes)

### If fixes aren't live, deploy them:

```bash
cd dance-school-cms

# 1. Build to check for errors
npm run build

# 2. If build succeeds, deploy
git add .
git commit -m "Deploy: Pass purchase issue fixes with webhook improvements"
git push origin main

# 3. Wait for Vercel deployment (2-3 minutes)
# Check: https://vercel.com/your-project/deployments
```

### After deployment, verify:
1. Go to your subscriptions page
2. Look for the "Missing Pass?" button
3. Test it with a student account

---

## 📱 FOR STUDENTS (Self-Service)

If a student contacts you about a missing pass:

### Option 1: Use the Website (Easiest)
1. Go to [Your School]/subscriptions
2. Click the "Missing Pass?" button
3. Wait 5 seconds
4. Refresh the page
5. Pass should appear

### Option 2: Manual Recovery (If Option 1 fails)
Contact support with:
- Your email address
- Date of purchase
- Pass name purchased

We'll fix it within 5 minutes.

---

## 🔧 TROUBLESHOOTING

### "Script not found" error
```bash
# Make scripts executable
chmod +x dance-school-cms/diagnose-missing-passes.mjs
chmod +x dance-school-cms/recover-all-missing-passes.mjs
```

### "Missing environment variables" error
Check your `.env` file has:
```
STRIPE_SECRET_KEY=sk_...
NEXT_PUBLIC_SANITY_PROJECT_ID=...
NEXT_PUBLIC_SANITY_DATASET=...
SANITY_API_TOKEN=...
```

### "No purchases found" but students are complaining
- Check if you're using the right Stripe account (test vs live)
- Verify the date range (script checks last 7 days)
- Ask students for their purchase confirmation email

### Subscription created but student still doesn't see it
1. Ask them to sign out and sign back in
2. Check if they're using the correct email address
3. Clear browser cache
4. Try a different browser

---

## 📊 MONITORING

### Daily Checks (2 minutes)
```bash
# Check for new missing passes
node diagnose-missing-passes.mjs

# If any found, run recovery
node recover-all-missing-passes.mjs
```

### Weekly Review
- Check webhook logs in Sanity Studio
- Review manual sync button usage
- Track customer complaints
- Monitor success rate

---

## 🎯 SUCCESS CRITERIA

✅ All affected students have their passes
✅ Students can see passes at /subscriptions
✅ "Missing Pass?" button is visible and working
✅ No new complaints about missing passes

---

## 📞 ESCALATION

If the scripts don't work or you need help:

1. **Check the logs:**
   - Vercel deployment logs
   - Sanity Studio webhook logs
   - Browser console errors

2. **Manual fix:**
   - Use existing script: `create-subscription-for-user.mjs`
   - Or create manually in Sanity Studio

3. **Contact developer:**
   - Provide: student email, purchase date, error messages
   - Include: screenshots of any errors
   - Share: output from diagnostic script

---

**Last Updated:** [Current Date]
**Status:** Ready for immediate use
**Estimated Fix Time:** 5-10 minutes for all students
