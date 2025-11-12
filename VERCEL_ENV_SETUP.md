# Vercel Environment Variables Setup

## Required Environment Variables

### 1. Database
```
DATABASE_URL=postgresql://username:password@host:port/database
```

### 2. NextAuth Configuration
```
NEXTAUTH_URL=https://flib-book-production.vercel.app
NEXTAUTH_SECRET=your-super-secret-key-here-minimum-32-characters
```

### 3. Supabase Configuration
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Razorpay (Optional)
```
RAZORPAY_KEY_ID=your-razorpay-key-id
RAZORPAY_KEY_SECRET=your-razorpay-key-secret
```

## Vercel Deployment Steps

1. **Go to Vercel Dashboard**
   - Navigate to your project settings
   - Click on "Environment Variables"

2. **Add Each Variable**
   - Name: `DATABASE_URL`
   - Value: Your PostgreSQL connection string
   - Environment: Production, Preview, Development

3. **Critical Settings**
   - ✅ `NEXTAUTH_URL` must be `https://flib-book-production.vercel.app`
   - ✅ `NEXTAUTH_SECRET` must be at least 32 characters
   - ✅ `NEXT_PUBLIC_*` variables are exposed to the browser
   - ✅ No quotes around values in Vercel UI

4. **After Adding Variables**
   - Redeploy the application
   - Check deployment logs for any errors

## Common Issues & Solutions

### Issue: "Application error: a client-side exception has occurred"

**Solutions:**
- ✅ Verify all `NEXT_PUBLIC_*` variables are set
- ✅ Check `NEXTAUTH_URL` matches your domain exactly
- ✅ Ensure `NEXTAUTH_SECRET` is set and long enough

### Issue: Database connection errors

**Solutions:**
- ✅ Verify `DATABASE_URL` format is correct
- ✅ Ensure database is accessible from Vercel
- ✅ Check if database requires SSL (add `?sslmode=require`)

### Issue: Authentication not working

**Solutions:**
- ✅ Verify `NEXTAUTH_URL` is exactly your domain
- ✅ Check `NEXTAUTH_SECRET` is set
- ✅ Ensure no trailing slashes in URLs

## Testing Deployment

After setting environment variables:

1. **Check Homepage**
   - Visit https://flib-book-production.vercel.app
   - Should load without errors

2. **Test Authentication**
   - Try to register a new account
   - Try to login
   - Check if dashboard loads

3. **Check API Routes**
   - Test `/api/health` (should return status)
   - Test `/api/documents` (should require auth)
   - Test `/api/auth/register`

## Environment Variable Validation

The app includes automatic validation:
- Server-side validation in `lib/env.ts`
- Client-side validation for public variables
- Error boundary to catch and display issues
- Health check endpoint at `/api/health`

## Security Notes

- Never commit `.env` files to git
- Use different secrets for production vs development
- Rotate secrets regularly
- Monitor Vercel logs for any exposed secrets
