# Secure Sharing & Inbox - Migration Guide

## Overview

This guide walks you through deploying the Secure Sharing & Inbox feature to your FlipBook DRM application.

## Prerequisites

- Node.js 18+ installed
- PostgreSQL database access
- Vercel account (for deployment)
- Environment variables configured

## Step 1: Database Migration

### Local Development

1. **Ensure your database is running**
   ```bash
   # Check your DATABASE_URL in .env
   ```

2. **Run the migration**
   ```bash
   npx prisma migrate dev --name sharing-and-inbox
   ```

3. **Verify the migration**
   ```bash
   npx prisma studio
   ```
   
   Check that these tables exist:
   - `share_links` (updated with new fields)
   - `document_shares` (new table)

### Production Deployment

1. **Push schema to production database**
   ```bash
   npx prisma migrate deploy
   ```

2. **Or use Prisma Studio to verify**
   ```bash
   npx prisma studio --browser none
   ```

## Step 2: Environment Variables

### Required Variables

Ensure these are set in your `.env` (local) and Vercel (production):

```env
# Database
DATABASE_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"
AUTH_URL="https://your-domain.com"

# Storage (Supabase)
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
SUPABASE_SERVICE_ROLE_KEY="..."

# Optional: Email notifications (for future)
# RESEND_API_KEY="re_..."
```

### Vercel Configuration

1. Go to your Vercel project settings
2. Navigate to Environment Variables
3. Add/verify all required variables
4. Redeploy if needed

## Step 3: Install Dependencies

```bash
npm install
```

The following packages are already in package.json:
- `nanoid` - Secure share key generation
- `zod` - Input validation
- `bcryptjs` - Password hashing

## Step 4: Build and Test Locally

1. **Start development server**
   ```bash
   npm run dev
   ```

2. **Test the features**
   - Navigate to http://localhost:3000
   - Login to your account
   - Upload a document
   - Click "Share" button
   - Test link sharing with various options
   - Test email sharing
   - Check inbox at http://localhost:3000/inbox
   - Access a shared document
   - Test password protection
   - Revoke shares from document details

## Step 5: Deploy to Vercel

### Option A: Git Push (Recommended)

```bash
git add .
git commit -m "Add Secure Sharing & Inbox feature"
git push origin main
```

Vercel will automatically deploy.

### Option B: Manual Deploy

```bash
vercel --prod
```

## Step 6: Post-Deployment Verification

### 1. Check Database

```bash
# Connect to production database
npx prisma studio
```

Verify tables exist and are empty (ready for data).

### 2. Test Core Flows

**Link Sharing:**
1. Create a document
2. Generate a share link
3. Copy the link
4. Open in incognito window
5. Verify access works

**Email Sharing:**
1. Share a document via email
2. Login as recipient
3. Check inbox
4. Access shared document

**Password Protection:**
1. Create password-protected share
2. Access link
3. Enter password
4. Verify access granted

**Share Management:**
1. View document details
2. Check "Shares" tab
3. Revoke a share
4. Verify access denied

### 3. Monitor Logs

Check Vercel logs for any errors:
```bash
vercel logs
```

## Step 7: Performance Optimization

### Database Indexes

The migration includes these indexes:
- `share_links.shareKey` (unique)
- `share_links.documentId`
- `share_links.userId`
- `share_links.restrictToEmail`
- `document_shares.documentId`
- `document_shares.sharedByUserId`
- `document_shares.sharedWithUserId`
- `document_shares.sharedWithEmail`

### Caching

Consider adding caching for:
- Inbox queries (Redis)
- Share validation (short TTL)

## Rollback Procedure

If you need to rollback:

### 1. Revert Code

```bash
git revert HEAD
git push origin main
```

### 2. Rollback Database (if needed)

```bash
# Find the migration
npx prisma migrate status

# Rollback (careful!)
npx prisma migrate resolve --rolled-back <migration-name>
```

**Note:** Database rollback will delete share data. Only do this if absolutely necessary.

## Troubleshooting

### Issue: Migration fails

**Solution:**
```bash
# Reset database (development only!)
npx prisma migrate reset

# Or manually fix conflicts
npx prisma migrate resolve --applied <migration-name>
```

### Issue: Share links not working

**Check:**
1. DATABASE_URL is correct
2. ShareLink table exists
3. Indexes are created
4. Session authentication is working

### Issue: Password verification fails

**Check:**
1. bcryptjs is installed
2. Password is being hashed on creation
3. Cookie settings are correct (secure, httpOnly)

### Issue: Inbox is empty

**Check:**
1. DocumentShare table exists
2. User email matches share email
3. Shares haven't expired
4. Query is using correct user ID/email

## Security Checklist

Before going live, verify:

- [ ] All API routes require authentication
- [ ] Ownership verification on all operations
- [ ] Passwords are hashed (never stored plain text)
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (using Prisma)
- [ ] XSS prevention (sanitized inputs)
- [ ] CSRF protection (Next.js built-in)
- [ ] Secure cookies (httpOnly, secure in production)
- [ ] Rate limiting (consider adding)
- [ ] Error messages don't leak sensitive info
- [ ] Logging doesn't include passwords/tokens

## Monitoring

### Key Metrics to Track

1. **Share Creation Rate**
   - Links created per day
   - Email shares per day

2. **Share Access Rate**
   - Views per share
   - Failed access attempts

3. **Error Rates**
   - API errors
   - Validation failures
   - Authentication failures

4. **Performance**
   - API response times
   - Database query times
   - Page load times

### Logging

All operations are logged with:
- User ID
- Action type
- Timestamp
- Success/failure
- Error details (if any)

Check logs in Vercel dashboard or your logging service.

## Support

If you encounter issues:

1. Check the logs (Vercel dashboard)
2. Verify environment variables
3. Test database connection
4. Review error messages
5. Check browser console for client errors

## Next Steps

### Optional Enhancements

1. **Email Notifications**
   - Integrate Resend or SendGrid
   - Send notifications on share creation
   - Add email templates

2. **Rate Limiting**
   - Add middleware for rate limiting
   - Prevent abuse

3. **Analytics Dashboard**
   - Create share analytics page
   - Show trends and insights

4. **Bulk Sharing**
   - Allow sharing with multiple emails
   - CSV import for bulk shares

## Conclusion

Your Secure Sharing & Inbox feature is now deployed and ready to use! Users can:

- Create secure share links with access controls
- Share documents via email
- View shared documents in their inbox
- Manage and revoke shares
- Access password-protected documents

For questions or issues, refer to the main documentation or check the implementation summary.
