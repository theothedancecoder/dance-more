# Student Issue - Action Plan

## 🔍 Diagnosis Results

Based on the comprehensive diagnostic, here's what we found:

### Current Situation:
- **Stripe Mode**: 🟡 TEST MODE (not live)
- **Recent Purchases**: 0 in last 30 days (in test mode)
- **Subscriptions**: 20 active subscriptions found
- **Webhook Logs**: ⚠️ None found (schema not deployed)
- **Issue**: Students complaining about missing passes

### Key Findings:
1. ✅ All existing subscriptions in Sanity are active
2. ⚠️ No webhook logs = webhook improvements not deployed to production
3. ⚠️ Using TEST mode Stripe (students likely purchased in LIVE mode)
4. ⚠️ Recent subscriptions were NOT created via webhook (manual creation)

---

## 🎯 ROOT CAUSE

The issue is likely one of these:

### Most Likely: Stripe Mode Mismatch
- Your `.env.local` has TEST mode Stripe keys
- Students are purchasing in LIVE mode (production)
- Diagnostic script is checking TEST mode (no purchases found)
- **Solution**: Check LIVE mode Stripe for actual purchases

### Also Possible: Webhook Improvements Not Deployed
- Webhook logging schema not in production
- Enhanced webhook with retry logic not deployed
- Manual sync button may not be available to students
- **Solution**: Deploy the webhook improvements

---

## 🚀 IMMEDIATE ACTIONS

### Step 1: Check LIVE Mode Stripe (5 minutes)

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com
2. **Switch to LIVE mode** (toggle in top left)
3. **Check Payments**: Look for recent successful payments
4. **Note affected students**: Write down their emails and purchase dates

### Step 2: Verify Production Environment (2 minutes)

Check your production site:
1. Go to: `https://your-production-url.com/[tenant-slug]/subscriptions`
2. Sign in as a student
3. Look for:
   - ✅ "Missing Pass?" button visible
   - ✅ Real-time status checking after purchase
   - ✅ Manual sync functionality

If these aren't there, the fixes aren't deployed.

### Step 3: Deploy Webhook Improvements (if needed - 15 minutes)

If the fixes aren't in production:

```bash
cd dance-school-cms

# 1. Deploy Sanity schema first
npx sanity deploy

# 2. Build and test
npm run build

# 3. Deploy to production
git add .
git commit -m "Deploy: Webhook improvements and pass purchase fixes"
git push origin main

# 4. Wait for Vercel deployment
# Check: https://vercel.com/your-project
```

### Step 4: Recover Missing Passes (10 minutes)

Once you have the list of affected students from Step 1:

**Option A: Use the Manual Sync Button (Easiest)**
1. Ask each student to:
   - Go to their subscriptions page
   - Click "Missing Pass?" button
   - Wait 5 seconds and refresh

**Option B: Run Recovery Script**
```bash
# This will check LIVE mode if you update the env
cd dance-school-cms

# First, temporarily update to use LIVE mode keys
# Edit .env.local and change STRIPE_SECRET_KEY to live key

# Then run recovery
node recover-all-missing-passes.mjs

# Don't forget to change back to test keys after!
```

**Option C: Manual Creation**
For each affected student:
```bash
node create-subscription-for-user.mjs
# Follow the prompts
```

---

## 📋 DETAILED STEPS

### A. Check LIVE Mode Stripe

1. **Login to Stripe Dashboard**
   - URL: https://dashboard.stripe.com
   - Switch to LIVE mode (toggle top-left)

2. **Navigate to Payments**
   - Click "Payments" in left sidebar
   - Filter by "Successful" payments
   - Look at last 30 days

3. **For Each Recent Payment**:
   - Note customer email
   - Note amount and date
   - Click into payment details
   - Check "Metadata" section for:
     - `type: pass_purchase`
     - `passId`
     - `userId`
     - `tenantId`

4. **Create a List**:
   ```
   Student Email | Purchase Date | Amount | Pass Type
   --------------|---------------|--------|----------
   student1@...  | Jan 15       | 150 kr | Drop-in
   student2@...  | Jan 18       | 500 kr | 10-class
   ```

### B. Verify Each Student's Subscription

For each student on your list:

1. **Check in Sanity Studio**:
   - Go to: https://your-project.sanity.studio
   - Navigate to "Subscriptions"
   - Search for student's email
   - Check if subscription exists

2. **If Missing**:
   - Note it down for recovery
   - Check if user exists in Sanity
   - Verify the pass they purchased exists

### C. Deploy Fixes (If Not Already Deployed)

1. **Check Current Deployment**:
   ```bash
   # Check when last deployed
   git log -1 --oneline
   
   # Check if webhook improvements are in code
   grep -r "createdViaWebhook" dance-school-cms/src/app/api/stripe/webhook/
   ```

2. **Deploy Sanity Schema**:
   ```bash
   cd dance-school-cms
   npx sanity deploy
   ```
   
   This deploys the `webhookLog` schema type.

3. **Deploy Application**:
   ```bash
   # Make sure all changes are committed
   git status
   
   # If there are uncommitted changes
   git add .
   git commit -m "Deploy: Pass purchase fixes"
   
   # Push to trigger Vercel deployment
   git push origin main
   ```

4. **Verify Deployment**:
   - Go to Vercel dashboard
   - Wait for deployment to complete (2-3 minutes)
   - Check deployment logs for errors
   - Test the subscriptions page

### D. Recover Missing Subscriptions

**Method 1: Student Self-Service (Preferred)**

1. Send email to affected students:
   ```
   Subject: Action Required: Activate Your Dance Pass
   
   Hi [Name],
   
   We've made improvements to our system. To activate your recently 
   purchased pass, please:
   
   1. Go to: [Your School URL]/subscriptions
   2. Click the "Missing Pass?" button
   3. Wait 5 seconds
   4. Refresh your browser
   
   Your pass should now appear!
   
   If you have any issues, please reply to this email.
   
   Best regards,
   [Your Name]
   ```

2. Monitor results:
   - Check if students' passes appear
   - Follow up with anyone who still has issues

**Method 2: Automated Recovery**

1. **Update environment for LIVE mode**:
   ```bash
   # Backup current .env.local
   cp .env.local .env.local.backup
   
   # Edit .env.local
   # Change STRIPE_SECRET_KEY to your live key
   # (Get from Stripe Dashboard > Developers > API Keys)
   ```

2. **Run recovery script**:
   ```bash
   cd dance-school-cms
   node recover-all-missing-passes.mjs
   ```

3. **Review results**:
   - Check how many subscriptions were created
   - Note any errors
   - Verify in Sanity Studio

4. **Restore test keys**:
   ```bash
   # Restore backup
   mv .env.local.backup .env.local
   ```

**Method 3: Manual Creation (Last Resort)**

For each student:

1. **Gather information**:
   - Student email
   - Pass purchased
   - Purchase date
   - Amount paid

2. **Run creation script**:
   ```bash
   node create-subscription-for-user.mjs
   ```

3. **Verify**:
   - Check in Sanity Studio
   - Ask student to check their account

---

## ✅ VERIFICATION

After recovery, verify everything works:

### 1. Check Student Accounts
- [ ] All affected students can see their passes
- [ ] Pass details are correct (type, expiry, classes remaining)
- [ ] Students can book classes

### 2. Test New Purchases
- [ ] Make a test purchase (small amount)
- [ ] Verify pass appears immediately
- [ ] Check webhook logs in Sanity
- [ ] Confirm no errors

### 3. Monitor System
- [ ] Check webhook logs daily for 1 week
- [ ] Track manual sync button usage
- [ ] Monitor customer complaints
- [ ] Review success rate

---

## 📊 SUCCESS CRITERIA

- ✅ All affected students have their passes
- ✅ Passes show correct details
- ✅ Students can book classes
- ✅ New purchases work automatically
- ✅ Webhook logs show success
- ✅ No new complaints

---

## 🔄 ONGOING MONITORING

### Daily (2 minutes):
```bash
# Check for new issues
cd dance-school-cms
node diagnose-student-issue.mjs
```

### Weekly:
- Review webhook logs in Sanity Studio
- Check manual sync usage
- Analyze success rate
- Address any patterns

### Monthly:
- Generate metrics report
- Review and optimize
- Update documentation

---

## 📞 SUPPORT

### For Students:
**"My pass isn't showing"**
1. Refresh browser (Ctrl+R / Cmd+R)
2. Click "Missing Pass?" button
3. Wait 5 seconds and refresh again
4. If still missing, contact support with:
   - Your email address
   - Purchase date
   - Purchase confirmation email

### For Support Team:
**Quick Fix:**
1. Ask for student email
2. Check Sanity Studio for subscription
3. If missing, run recovery script
4. Verify with student

### Escalation:
If recovery doesn't work:
1. Check Stripe payment details
2. Verify pass configuration
3. Check user account exists
4. Review webhook logs
5. Contact developer if needed

---

**Last Updated**: [Current Date]
**Status**: Ready for Action
**Priority**: HIGH
**Estimated Time**: 30-60 minutes total
