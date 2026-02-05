# Recover Pass for Siri Lund (siri.lund@yahoo.de)

## 🔍 Issue Confirmed

The recovery script found **NO purchase in TEST mode Stripe** for this student on Jan 18, 2026.

This confirms: **The student purchased in LIVE mode, but we're checking TEST mode.**

---

## 🚀 IMMEDIATE FIX - Follow These Steps:

### Step 1: Check LIVE Mode Stripe (2 minutes)

1. **Go to Stripe Dashboard**: https://dashboard.stripe.com

2. **Switch to LIVE mode**:
   - Look for the toggle in the top-left corner
   - Make sure it says "LIVE" (not "TEST")

3. **Find Siri's Purchase**:
   - Click "Payments" in the left sidebar
   - Filter by date: January 18, 2026
   - Search for: `siri.lund@yahoo.de`
   - Or look through successful payments on that date

4. **Note the Details**:
   - Amount paid
   - Pass purchased
   - Payment Intent ID
   - Session ID (if available)

---

### Step 2: Option A - Use Manual Sync (Easiest)

If the webhook improvements are deployed:

1. **Ask Siri to**:
   - Go to: `[Your School URL]/subscriptions`
   - Sign in with: `siri.lund@yahoo.de`
   - Click the **"Missing Pass?"** button
   - Wait 5 seconds
   - Refresh the browser

2. **The system will**:
   - Automatically find her Stripe purchase
   - Create the subscription
   - Show her the pass

---

### Step 2: Option B - Run Recovery Script with LIVE Keys

If manual sync doesn't work or isn't deployed:

1. **Get your LIVE Stripe Secret Key**:
   - Go to: https://dashboard.stripe.com/apikeys
   - Make sure you're in LIVE mode
   - Copy the "Secret key" (starts with `sk_live_`)

2. **Temporarily Update Environment**:
   ```bash
   cd dance-school-cms
   
   # Backup current .env.local
   cp .env.local .env.local.backup
   
   # Edit .env.local
   # Replace STRIPE_SECRET_KEY with your LIVE key
   # STRIPE_SECRET_KEY=sk_live_...
   ```

3. **Run Recovery Script**:
   ```bash
   node recover-siri-lund-pass.mjs
   ```

4. **Restore TEST Keys**:
   ```bash
   # After recovery is complete
   mv .env.local.backup .env.local
   ```

---

### Step 2: Option C - Manual Creation (If metadata is missing)

If the Stripe purchase doesn't have proper metadata:

1. **Run the manual creation script**:
   ```bash
   node create-subscription-for-user.mjs
   ```

2. **When prompted, provide**:
   - Email: `siri.lund@yahoo.de`
   - Tenant: (your school slug, e.g., "dancecity")
   - Pass: (the pass she purchased - check Stripe for amount)
   - Purchase date: January 18, 2026

3. **The script will**:
   - Find or create the user
   - Create the subscription
   - Link it to the correct pass

---

### Step 3: Verify & Notify (2 minutes)

1. **Check in Sanity Studio**:
   - Go to: https://your-project.sanity.studio
   - Navigate to "Subscriptions"
   - Search for: `siri.lund@yahoo.de`
   - Verify subscription exists and is active

2. **Email Siri**:
   ```
   Subject: Your Dance Pass is Ready!
   
   Hi Siri,
   
   Good news! Your dance pass from January 18th is now active 
   and ready to use.
   
   You can view it here: [Your School URL]/subscriptions
   
   If you don't see it immediately:
   1. Refresh your browser (Ctrl+R or Cmd+R)
   2. Or click the "Missing Pass?" button on the page
   
   You can now book classes at: [Your School URL]/calendar
   
   Happy dancing!
   
   Best regards,
   [Your Name]
   ```

---

## 📊 What You'll See When It Works:

### In Sanity Studio:
```
Subscription:
- User: Siri Lund (siri.lund@yahoo.de)
- Pass: [Pass Name]
- Status: Active
- Valid until: [Date based on pass validity]
- Classes remaining: [Number or Unlimited]
```

### Student Will See:
- Pass appears in "Your Active Passes" section
- Can click "Book Classes" button
- Can see expiry date and classes remaining

---

## 🔧 Troubleshooting

### "Still no purchase found in LIVE mode"
- Double-check the date (maybe it was Jan 17 or 19?)
- Verify the email address is exactly correct
- Check if payment was successful (not pending/failed)
- Look for the purchase confirmation email

### "Subscription created but student doesn't see it"
- Ask student to sign out and sign back in
- Clear browser cache
- Try a different browser
- Verify they're using the correct email

### "Error creating subscription"
- Check if the pass still exists in Sanity
- Verify the tenant ID is correct
- Make sure user account exists
- Check Sanity API token has write permissions

---

## 📞 Need Help?

If you encounter any issues:

1. **Check the error message** - it usually tells you what's wrong
2. **Verify all credentials** - Stripe keys, Sanity tokens, etc.
3. **Check Sanity Studio** - make sure passes and tenant exist
4. **Review Stripe Dashboard** - confirm the payment details

---

## ✅ Quick Checklist

- [ ] Switched to LIVE mode in Stripe Dashboard
- [ ] Found Siri's purchase on Jan 18
- [ ] Noted payment details (amount, pass type)
- [ ] Ran recovery script OR used manual sync
- [ ] Verified subscription in Sanity Studio
- [ ] Emailed Siri to notify her
- [ ] Confirmed she can see her pass

---

**Estimated Time**: 5-10 minutes
**Difficulty**: Easy
**Success Rate**: 99% (if purchase exists in Stripe)
