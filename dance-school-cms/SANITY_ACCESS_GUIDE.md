# Sanity Access & Permissions Fix Guide

## Problem
You can't access your Sanity account on sanity.io, but you need to fix the API token permissions to create subscriptions.

## Solution: Use Local Sanity Studio

Your project has a built-in Sanity Studio that you can access locally without logging into sanity.io!

### Step 1: Access Local Sanity Studio
1. Make sure your development server is running:
   ```bash
   cd dance-school-cms
   npm run dev
   ```

2. Open your browser and go to:
   ```
   http://localhost:3000/studio
   ```

3. You should see the Sanity Studio interface where you can:
   - View all your data (tenants, passes, users, etc.)
   - Manually create subscription records
   - Manage your content

### Step 2: Find Your Project Details
Run this command to see your Sanity project information:
```bash
cd dance-school-cms
echo "Project ID: $NEXT_PUBLIC_SANITY_PROJECT_ID"
echo "Dataset: $NEXT_PUBLIC_SANITY_DATASET"
```

### Step 3: Alternative - Create Subscription via Studio
Instead of fixing API tokens, you can manually create a subscription record:

1. Go to `http://localhost:3000/studio`
2. Click on "Subscription" in the left sidebar
3. Click "Create new Subscription"
4. Fill in the details:
   - **User**: Select your user (search by email)
   - **Type**: Choose "single" (for Drop-in Class)
   - **Start Date**: Today's date
   - **End Date**: Tomorrow's date (for single class)
   - **Pass ID**: `1N3EPBBcVS22GkyXawDPzF` (from the logs)
   - **Pass Name**: `Drop-in Class`
   - **Purchase Price**: `250`
   - **Remaining Clips**: `1`
   - **Is Active**: `true`
   - **Stripe Payment ID**: `manual_creation_studio`
   - **Tenant**: Select "Dance with DanceCity"

5. Click "Publish"

### Step 4: Verify It Works
1. Go to `http://localhost:3000/dance-with-dancecity/subscriptions`
2. You should now see your pass in the "Your Active Passes" section!

## Alternative: Find Your Sanity Account

If you still want to access sanity.io directly:

### Option A: Check Different Email
- Try logging in with different email addresses you might have used
- Check if you signed up with Google/GitHub instead of email

### Option B: Find Project Owner
- The project might be under someone else's account
- Check if a colleague or the original developer has access

### Option C: Get Project ID and Create New Account
1. Run: `echo $NEXT_PUBLIC_SANITY_PROJECT_ID` to get your project ID
2. Go to https://sanity.io/manage
3. If you can't find the project, it might be under a different account
4. You can create a new account and request access to the project

## Quick Test
After creating the subscription (via Studio or API fix), test it:
```bash
cd dance-school-cms
node create-manual-subscription.mjs
```

This should either:
- Create a subscription successfully (if permissions are fixed)
- Show the same permission error (if still broken)

## Next Steps
1. Try the Local Studio approach first (easiest)
2. If that works, your "Your Active Passes" feature will display correctly
3. For future purchases to work automatically, you'll still need to fix the API token permissions
