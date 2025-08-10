# 🌐 CLERK PRODUCTION DNS RECORDS

## Required DNS Records for dancemore.app

Add these CNAME records to your DNS provider:

### 1. Account Portal
```
Name: accounts
Type: CNAME
Value: accounts.clerk.services
TTL: Auto (or 300)
```
**Result**: `accounts.dancemore.app` → Clerk account management

### 2. Email Service
```
Name: clkmail
Type: CNAME
Value: mail.n3jflyelq8no.clerk.services
TTL: Auto (or 300)
```
**Result**: `clkmail.dancemore.app` → Clerk email service

### 3. DKIM Email Authentication (Record 1)
```
Name: clk._domainkey
Type: CNAME
Value: dkim1.n3jflyelq8no.clerk.services
TTL: Auto (or 300)
```
**Result**: Email authentication for security

### 4. DKIM Email Authentication (Record 2)
```
Name: clk2._domainkey
Type: CNAME
Value: dkim2.n3jflyelq8no.clerk.services
TTL: Auto (or 300)
```
**Result**: Additional email authentication

## ✅ DNS Setup Checklist

- [ ] `accounts` CNAME record added
- [ ] `clkmail` CNAME record added
- [ ] `clk._domainkey` CNAME record added
- [ ] `clk2._domainkey` CNAME record added
- [ ] DNS propagation complete (wait 5-10 minutes)

## 🧪 Verify DNS Setup

After adding all records, test them:

```bash
# Test account portal
nslookup accounts.dancemore.app

# Test email service
nslookup clkmail.dancemore.app

# Test DKIM records
nslookup clk._domainkey.dancemore.app
nslookup clk2._domainkey.dancemore.app
```

## 🚀 Next Steps

Once DNS records are added:
1. Wait 5-10 minutes for DNS propagation
2. Update Vercel environment variables with production Clerk keys
3. Deploy to production
4. Test authentication flow

Your Clerk production setup will be complete! 🎉
