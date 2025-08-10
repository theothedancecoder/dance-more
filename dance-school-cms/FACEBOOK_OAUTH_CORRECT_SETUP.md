# 📘 CORRECT FACEBOOK OAUTH SETUP FOR CLERK

## 🔧 CORRECTED FACEBOOK APP CONFIGURATION

### ✅ **ENABLE THESE SETTINGS:**
- **✅ Client OAuth login** - YES, enable this
- **✅ Web OAuth login** - YES, enable this  
- **✅ Enforce HTTPS** - YES, strongly recommended for production
- **✅ Use Strict Mode for redirect URIs** - YES, strongly recommended
- **✅ Login with the JavaScript SDK** - YES, enable this

### 🔗 **CORRECT REDIRECT URIS TO ADD**

Add these exact URLs to **Valid OAuth Redirect URIs**:

```
https://clerk.dancemore.app/v1/oauth_callback/oauth_facebook
```

**Note:** This is the ONLY redirect URI you need! Clerk handles the OAuth flow and redirects users back to your application.

### 🌐 **ALLOWED DOMAINS FOR JAVASCRIPT SDK**

Add these domains to **Allowed Domains for the JavaScript SDK**:

```
www.dancemore.app
dancemore.app
clerk.dancemore.app
```

### 📋 **LEGAL PAGES URLS**

Use these URLs for Facebook's required legal pages:

- **Privacy Policy URL**: `https://www.dancemore.app/privacy`
- **Terms of Service URL**: `https://www.dancemore.app/terms`
- **User Data Deletion URL**: `https://www.dancemore.app/data-deletion`

## ✅ **COMPLETE CONFIGURATION CHECKLIST**

- [ ] **Client OAuth login**: ✅ ENABLED
- [ ] **Web OAuth login**: ✅ ENABLED  
- [ ] **Enforce HTTPS**: ✅ ENABLED
- [ ] **Use Strict Mode for redirect URIs**: ✅ ENABLED
- [ ] **Login with the JavaScript SDK**: ✅ ENABLED
- [ ] **Valid OAuth Redirect URI**: `https://clerk.dancemore.app/v1/oauth_callback/oauth_facebook`
- [ ] **JavaScript SDK Domains**: Added 3 domains above
- [ ] **Privacy Policy URL**: `https://www.dancemore.app/privacy`
- [ ] **Terms of Service URL**: `https://www.dancemore.app/terms`
- [ ] **Data Deletion URL**: `https://www.dancemore.app/data-deletion`

## 🔑 **AFTER FACEBOOK SETUP**

Once Facebook OAuth is configured:

1. **Copy your Facebook App ID and Secret**
2. **Go to Clerk Dashboard → Social Connections → Facebook**
3. **Add your Facebook credentials**
4. **Test the OAuth flow**

## 🧪 **TEST THE SETUP**

After configuration, test by:
1. Going to your sign-in page
2. Clicking "Sign in with Facebook"
3. Verifying the OAuth flow works correctly

Your Clerk + Facebook OAuth integration will be complete! 🎉
