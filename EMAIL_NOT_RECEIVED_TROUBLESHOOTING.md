# Email Not Received - Troubleshooting Guide

## Issues

### 1. Registration Email Not Received
You registered successfully but didn't receive the verification email at `hodcsm@necg.ac.in`.

### 2. Password Reset Error
Getting error: "Failed to send password reset email. Please try again later."

## Root Cause
**The Resend API key is not configured in your production environment (Vercel).**

Both issues are caused by the same problem - the email service cannot send emails without a valid API key.

## Quick Fix Steps

### 1. Check Vercel Environment Variables

Go to your Vercel project dashboard:
1. Navigate to **Settings** → **Environment Variables**
2. Check if these variables exist:
   - `RESEND_API_KEY`
   - `RESEND_FROM_EMAIL`
   - `NEXT_PUBLIC_APP_URL`

### 2. Get Resend API Key

If you don't have a Resend account yet:

1. Go to [resend.com](https://resend.com)
2. Sign up for a free account
3. Navigate to **API Keys** in the dashboard
4. Click **Create API Key**
5. Name it "FlipBook DRM Production"
6. Copy the API key (starts with `re_`)

### 3. Add Environment Variables to Vercel

In your Vercel project settings:

```
RESEND_API_KEY=re_your_actual_api_key_here
RESEND_FROM_EMAIL=onboarding@resend.dev
NEXT_PUBLIC_APP_URL=https://flib-book-production-vercel-app.vercel.app
```

**Note:** For testing, use `onboarding@resend.dev` as the FROM email. This is Resend's test domain and doesn't require domain verification.

### 4. Redeploy

After adding the environment variables:
1. Go to **Deployments** tab in Vercel
2. Click the three dots on the latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

### 5. Test Again

1. Try registering with a different email (or delete the existing user first)
2. Check your inbox and spam folder
3. If still not working, check Vercel logs

## Alternative: Resend Verification Email

Since you already registered, you can resend the verification email **after configuring the API key**:

1. Configure the Resend API key in Vercel (see steps above)
2. Redeploy the application
3. Go to the login page
4. Try to login with your credentials
5. You'll be redirected to the verification pending page
6. Click "Resend Verification Email"

**Note:** The resend will also fail until you configure the API key!

## Check Vercel Logs

To see if emails are being sent:

1. Go to Vercel dashboard
2. Click on your project
3. Go to **Logs** tab
4. Look for entries related to email sending
5. Check for errors like "RESEND_API_KEY is not configured"

## For Development/Testing

If you want to test locally first:

1. Create a `.env.local` file in your project root:
   ```env
   RESEND_API_KEY=re_your_api_key
   RESEND_FROM_EMAIL=onboarding@resend.dev
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Test registration at http://localhost:3000/register

## Verify Email Service is Working

You can test the email service directly using the test script:

```bash
# Set your email
export TEST_EMAIL=hodcsm@necg.ac.in

# Run the test
npm run test:email-delivery
```

This will send test emails and show you if there are any configuration issues.

## Common Issues

### Issue: "Failed to send password reset email"
**Error Message:** "Failed to send password reset email. Please try again later."

**Cause:** Resend API key is not configured.

**Solution:** 
1. Add `RESEND_API_KEY` to Vercel environment variables
2. Redeploy the application
3. Try the password reset again
4. The email will be sent successfully

### Issue: "RESEND_API_KEY is not configured"
**Solution:** Add the API key to Vercel environment variables and redeploy.

### Issue: Emails going to spam
**Solution:** 
- Check your spam folder
- For production, verify your domain in Resend
- Configure SPF, DKIM, and DMARC records

### Issue: "Invalid API key"
**Solution:** 
- Make sure you copied the full API key from Resend
- API keys start with `re_`
- Create a new API key if needed

### Issue: Rate limiting
**Solution:** 
- Free Resend accounts have limits
- Wait a few minutes and try again
- Upgrade Resend plan if needed

## Production Domain Setup (Optional)

For better deliverability in production, verify your domain:

1. Go to Resend dashboard → **Domains**
2. Click **Add Domain**
3. Enter your domain (e.g., `necg.ac.in`)
4. Add the DNS records provided by Resend:
   - SPF record
   - DKIM record
   - DMARC record
5. Wait for verification (5-10 minutes)
6. Update `RESEND_FROM_EMAIL` to use your domain:
   ```
   RESEND_FROM_EMAIL=noreply@necg.ac.in
   ```

## Need Help?

If you're still having issues:

1. Check the [EMAIL_VERIFICATION_SETUP.md](EMAIL_VERIFICATION_SETUP.md) guide
2. Review [docs/EMAIL_DELIVERY_TESTING.md](docs/EMAIL_DELIVERY_TESTING.md)
3. Check Resend status: https://status.resend.com/
4. Contact Resend support: support@resend.com

## Quick Test Command

Once you've configured the API key, test it quickly:

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer YOUR_RESEND_API_KEY' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "onboarding@resend.dev",
    "to": "hodcsm@necg.ac.in",
    "subject": "Test Email",
    "html": "<p>This is a test email from FlipBook DRM</p>"
  }'
```

If this works, your API key is valid and emails should be sent.

---

**Most Important:** Add the `RESEND_API_KEY` environment variable to Vercel and redeploy!
