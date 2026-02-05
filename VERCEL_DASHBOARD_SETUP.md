# 🚨 URGENT: Vercel Dashboard Configuration Required

## ⚠️ CRITICAL ISSUE
Your deployment is failing because the **Root Directory** is NOT configured in Vercel Dashboard.

**Current Evidence from Build Logs:**
```
Installing dependencies...
added 24 packages in 2s  ← This is the ROOT package.json (wrong!)
```

**Should be:**
```
Installing dependencies...
added 1437 packages in 1m  ← This is dance-school-cms/package.json (correct!)
```

---

## 🎯 THE ONLY SOLUTION THAT WORKS

You **MUST** configure the Root Directory in the Vercel Dashboard. There is NO other way.

### 📋 Step-by-Step Instructions

#### 1. Open Your Vercel Project Settings
- Go to: **https://vercel.com/dashboard**
- Find and click on your project: **dance-more**
- Click the **Settings** tab at the top

#### 2. Navigate to Root Directory Setting
- In the left sidebar, click **General** (should be selected by default)
- Scroll down to find the **Root Directory** section
- You'll see it's currently set to: `.` (dot = repository root)

#### 3. Edit Root Directory
- Click the **Edit** button next to Root Directory
- A text input will appear
- **Type exactly:** `dance-school-cms`
- Click **Save**

#### 4. Trigger Redeploy
Choose ONE of these options:

**Option A: Redeploy from Dashboard**
- Go to the **Deployments** tab
- Find the latest failed deployment
- Click the **⋯** (three dots) menu
- Click **Redeploy**

**Option B: Push a New Commit**
```bash
# Make any small change, like adding a comment
git commit --allow-empty -m "Trigger redeploy after Root Directory config"
git push origin main
```

---

## ✅ How to Verify It Worked

After redeploying, check the build logs. You should see:

### ✅ CORRECT Build Log:
```
Running "install" command: `npm install`...
added 1437 packages, and audited 1438 packages in 1m
```

### ✅ CORRECT Framework Detection:
```
Detected Next.js version: 15.3.4
```

### ❌ WRONG Build Log (current state):
```
Installing dependencies...
added 24 packages in 2s
Warning: Could not identify Next.js version
```

---

## 🔍 Why This Is Required

1. **Framework Detection Timing**: Vercel detects the framework BEFORE running any build commands
2. **vercel.json Limitation**: The `vercel.json` file cannot change where Vercel looks for the framework
3. **Dashboard-Only Setting**: Root Directory can ONLY be set in the Vercel Dashboard UI

---

## 📸 Visual Reference

When you edit the Root Directory, you should see:

```
Root Directory
Edit the directory in which your code is located. Leave this field empty if your code is located in the root directory.

[dance-school-cms]  ← Type this here

[Save] [Cancel]
```

---

## ⏱️ Time Required
**2 minutes** - This is a simple dashboard configuration change

---

## 🆘 Still Having Issues?

If you've configured the Root Directory and it's still failing:

1. **Double-check the spelling**: Must be exactly `dance-school-cms` (no spaces, no slashes)
2. **Verify it saved**: Refresh the Settings page and check the Root Directory shows `dance-school-cms`
3. **Clear deployment cache**: In Settings → General → scroll to bottom → click "Clear Cache"
4. **Redeploy again**: Sometimes takes 2 attempts after cache clear

---

## 📞 Quick Checklist

- [ ] Opened Vercel Dashboard
- [ ] Selected the dance-more project
- [ ] Clicked Settings tab
- [ ] Found Root Directory section
- [ ] Clicked Edit
- [ ] Typed: `dance-school-cms`
- [ ] Clicked Save
- [ ] Triggered a redeploy
- [ ] Checked build logs show 1437 packages installed
- [ ] Verified Next.js 15.3.4 detected

---

**Status:** ⚠️ WAITING FOR MANUAL DASHBOARD CONFIGURATION
**Action Required:** Configure Root Directory in Vercel Dashboard NOW
**Estimated Time:** 2 minutes
