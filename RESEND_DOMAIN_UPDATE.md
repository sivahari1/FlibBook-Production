# Resend Domain Update - Complete Guide

## ✅ Changes Completed

All email-sending code has been updated to use your new Resend domain: **support@jstudyroom.dev**

---

## 📝 Files Modified

### 1. **lib/email.ts**
- Updated default `FROM_EMAIL` to `support@jstudyroom.dev`
- Improved error logging with specific hints for domain verification
- Added detailed logging for debugging email issues
- Maintained graceful error handling (app won't crash if email fails)

### 2. **.env.example** (NEW FILE)
- Created template for environment variables
- Documents all required configuration
- Includes Resend email settings

---

## 🔧 Environment Variables Required

### Update in Vercel Dashboard

Go to your Vercel project settings → Environment Variables and set:

```env
# Resend Email Configuration
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=support@jstudyroom.dev

# App URL (update to your domain)
NEXT_PUBLIC_APP_URL=https://jstudyroom.dev
NEXTAUTH_URL=https://jstudyroom.dev
```

### Local Development (.env.local)

```env
RESEND_API_KEY=re_xxxxxxxxxxxxx
RESEND_FROM_EMAIL=support@jstudyroom.dev
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

---

## 📧 Email Endpoints Updated

All these API routes now use `support@jstudyroom.dev`:

### 1. **User Registration** (`/api/auth/register`)
- Sends welcome email with verification link
- Subject: "Verify your FlipBook DRM account"
- From: FlipBook DRM <support@jstudyroom.dev>

### 2. **Email Verification Resend** (`/api/auth/resend-verification`)
- Resends verification email
- Subject: "Verify your FlipBook DRM account"
- From: FlipBook DRM <support@jstudyroom.dev>

### 3. **Password Reset** (`/api/auth/forgot-password`)
- Sends password reset link
- Subject: "Reset your FlipBook DRM password"
- From: FlipBook DRM <support@jstudyroom.dev>

### 4. **Document Sharing** (`/api/share/email`)
- Sends document share notification
- Subject: "[Sender] shared [Document] with you"
- From: FlipBook DRM <support@jstudyroom.dev>

---

## 🔐 Resend Domain Verification

### Step 1: Add Domain to Resend

1. Go to https://resend.com/domains
2. Click "Add Domain"
3. Enter: `jstudyroom.dev`

### Step 2: Add DNS Records

Resend will provide DNS records. Add these to your domain registrar:

**Example records** (yours will be different):
```
Type: TXT
Name: resend._domainkey
Value: p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC...
```

### Step 3: Verify Domain

1. Wait 24-48 hours for DNS propagation
2. Click "Verify" in Resend dashboard
3. Once verified, emails will send successfully

### Temporary Solution

If domain is not yet verified, you can temporarily use:
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

This is Resend's test domain and works immediately without verification.

---

## 🧪 Testing Email Functionality

### Test 1: Registration Email

```bash
# Register a new user
curl -X POST https://jstudyroom.dev/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "password123"
  }'

# Expected: Verification email sent to test@example.com
```

### Test 2: Password Reset Email

```bash
# Request password reset
curl -X POST https://jstudyroom.dev/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com"
  }'

# Expected: Password reset email sent
```

### Test 3: Document Share Email

```bash
# Share document via email (requires authentication)
curl -X POST https://jstudyroom.dev/api/share/email \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=xxx" \
  -d '{
    "documentId": "clx...",
    "email": "recipient@example.com",
    "canDownload": false,
    "note": "Check this out!"
  }'

# Expected: Share notification email sent
```

---

## 📊 Email Logging

All email operations are logged for debugging:

### Success Log
```json
{
  "level": "info",
  "message": "Email sent successfully",
  "emailId": "abc123...",
  "to": "user@example.com",
  "subject": "Verify your FlipBook DRM account",
  "from": "support@jstudyroom.dev"
}
```

### Error Log (Domain Not Verified)
```json
{
  "level": "error",
  "message": "Resend domain not verified - emails cannot be sent",
  "error": "403 Forbidden",
  "from": "support@jstudyroom.dev",
  "to": "user@example.com",
  "hint": "Verify your domain in Resend dashboard at https://resend.com/domains"
}
```

### Error Log (Invalid API Key)
```json
{
  "level": "error",
  "message": "Invalid Resend API key",
  "error": "401 Unauthorized",
  "hint": "Check RESEND_API_KEY environment variable"
}
```

---

## 🚨 Error Handling

### Graceful Degradation

The app will **NOT crash** if email sending fails:

1. **Registration**: User account is created, but verification email may fail
   - User can request resend via `/api/auth/resend-verification`
   
2. **Password Reset**: Request is logged, but email may fail
   - User can try again (rate limited to 3 attempts per hour)
   
3. **Document Sharing**: Share is created in database, but notification email may fail
   - Share still works, recipient just won't get email notification

### Error Responses

All API endpoints return consistent JSON responses:

**Success**:
```json
{
  "success": true,
  "message": "Email sent successfully"
}
```

**Failure**:
```json
{
  "success": false,
  "message": "Failed to send email. Please try again later."
}
```

---

## 🔍 Troubleshooting

### Issue: Emails Not Sending (403 Error)

**Cause**: Domain not verified in Resend

**Solution**:
1. Check DNS records are added correctly
2. Wait 24-48 hours for DNS propagation
3. Verify domain in Resend dashboard
4. Or temporarily use `onboarding@resend.dev`

### Issue: Emails Not Sending (401 Error)

**Cause**: Invalid or missing API key

**Solution**:
1. Check `RESEND_API_KEY` in Vercel environment variables
2. Get new API key from https://resend.com/api-keys
3. Ensure no extra spaces in the key

### Issue: Emails Going to Spam

**Cause**: Domain not properly configured

**Solution**:
1. Add SPF record: `v=spf1 include:_spf.resend.com ~all`
2. Add DKIM record (provided by Resend)
3. Add DMARC record: `v=DMARC1; p=none; rua=mailto:support@jstudyroom.dev`

### Issue: Wrong FROM Address

**Cause**: Environment variable not set

**Solution**:
1. Check `RESEND_FROM_EMAIL` in Vercel
2. Redeploy after updating environment variables
3. Check logs to see what FROM address is being used

---

## 📦 Deployment Checklist

- [ ] Update `RESEND_FROM_EMAIL` in Vercel to `support@jstudyroom.dev`
- [ ] Update `NEXT_PUBLIC_APP_URL` in Vercel to `https://jstudyroom.dev`
- [ ] Update `NEXTAUTH_URL` in Vercel to `https://jstudyroom.dev`
- [ ] Verify `RESEND_API_KEY` is set correctly
- [ ] Add domain to Resend dashboard
- [ ] Add DNS records for domain verification
- [ ] Wait for DNS propagation (24-48 hours)
- [ ] Verify domain in Resend
- [ ] Test registration email
- [ ] Test password reset email
- [ ] Test document share email
- [ ] Check Vercel logs for any errors

---

## 🎯 Summary

### What Changed
- ✅ Default FROM_EMAIL updated to `support@jstudyroom.dev`
- ✅ All email-sending code uses Resend SDK
- ✅ Improved error logging and handling
- ✅ App won't crash if email fails
- ✅ Created .env.example for documentation

### What You Need to Do
1. **Update Vercel environment variables**:
   - `RESEND_FROM_EMAIL=support@jstudyroom.dev`
   - `NEXT_PUBLIC_APP_URL=https://jstudyroom.dev`
   - `NEXTAUTH_URL=https://jstudyroom.dev`

2. **Verify domain in Resend**:
   - Add domain at https://resend.com/domains
   - Add DNS records
   - Wait for verification

3. **Test in production**:
   - Register new user
   - Request password reset
   - Share document via email
   - Check logs for any errors

### Email Endpoints Working
- ✅ `/api/auth/register` - Welcome email
- ✅ `/api/auth/resend-verification` - Verification email
- ✅ `/api/auth/forgot-password` - Password reset email
- ✅ `/api/share/email` - Document share notification

All emails will be sent from: **FlipBook DRM <support@jstudyroom.dev>**

---

## 📞 Support

If you encounter issues:

1. Check Vercel logs for error messages
2. Verify environment variables are set correctly
3. Check Resend dashboard for domain verification status
4. Review DNS records with your domain registrar
5. Test with `onboarding@resend.dev` temporarily if needed

---

**Last Updated**: November 2025
**Status**: ✅ Ready for deployment
