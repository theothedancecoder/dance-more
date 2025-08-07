# Sanity Permissions Fix Guide

## Issue
The Stripe webhook and manual subscription creation are failing with:
```
"Insufficient permissions; permission 'create' required"
```

## Root Cause
The `SANITY_API_WRITE_TOKEN` in your `.env.local` file doesn't have sufficient permissions to create `subscription` documents.

## Solution Steps

### 1. Check Current Token Permissions
1. Go to your Sanity project dashboard: https://sanity.io/manage
2. Navigate to your project (likely named "dance-school-cms" or similar)
3. Go to **API** → **Tokens**
4. Find your current write token and check its permissions

### 2. Create/Update Write Token
You need a token with **Editor** or **Administrator** permissions:

1. In Sanity dashboard → **API** → **Tokens**
2. Either:
   - **Update existing token**: Click on your current token and change permissions to "Editor" or "Administrator"
   - **Create new token**: Click "Add API token"
     - Name: `Write Token` or similar
     - Permissions: **Editor** (recommended) or **Administrator**
     - Copy the generated token

### 3. Update Environment Variables
Update your `.env.local` file:
```env
SANITY_API_WRITE_TOKEN=your_new_token_here
```

### 4. Restart Development Server
```bash
cd dance-school-cms
npm run dev
```

## Test the Fix

### Option 1: Manual Subscription Creation
```bash
cd dance-school-cms
node create-manual-subscription.mjs
```

### Option 2: Test Purchase Flow
1. Go to http://localhost:3000/dance-with-dancecity/subscriptions
2. Purchase a pass using Stripe test mode
3. Check if the subscription appears in "Your Active Passes"

## Expected Success Output
When the permissions are fixed, you should see:
```
✅ Successfully created subscription: [subscription-id]
Pass: Drop-in Class
Valid until: [date]
Remaining classes: 1

🎉 Your pass should now appear in the "Your Active Passes" section!
```

## Verification
After fixing permissions:
1. Visit: http://localhost:3000/dance-with-dancecity/subscriptions
2. You should see your purchased passes in the "Your Active Passes" section
3. The webhook will work for future purchases

## Token Permission Levels
- **Viewer**: Read-only access (insufficient)
- **Editor**: Read/write access to documents (recommended)
- **Administrator**: Full access including schema changes (works but not necessary)

Choose **Editor** for security best practices.
