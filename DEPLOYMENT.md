# FlipBook DRM - Deployment Guide

This guide covers deploying the FlipBook DRM application to production on Vercel with proper security configuration.

## Prerequisites

- Node.js 18+ installed locally
- Vercel account
- Supabase project (PostgreSQL database and Storage)
- Razorpay account with API keys

## Environment Variables Checklist

### Required Environment Variables

Create these environment variables in your Vercel project settings or `.env.local` for local development:

#### Database & Storage
```bash
# Supabase PostgreSQL connection string
DATABASE_URL="postgresql://user:password@host:port/database?pgbouncer=true"

# Direct connection for migrations (without pgbouncer)
DIRECT_URL="postgresql://user:password@host:port/database"

# Supabase project details
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

#### Authentication
```bash
# NextAuth configuration
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
```

To generate a secure `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

#### Payment Processing
```bash
# Razorpay API credentials
RAZORPAY_KEY_ID="rzp_live_xxxxx"
RAZORPAY_KEY_SECRET="your-razorpay-secret"
```

#### Optional - IP Geolocation
```bash
# For view analytics location tracking (optional)
IP_GEOLOCATION_API_KEY="your-api-key"
```

#### Optional - Error Monitoring
```bash
# Sentry DSN for error tracking (optional)
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
```

### Environment Variable Security

- ✅ **Never commit** `.env.local` or `.env` files to version control
- ✅ Use Vercel's environment variable encryption
- ✅ Rotate secrets regularly (every 90 days recommended)
- ✅ Use different credentials for development, staging, and production
- ✅ Limit access to production environment variables

## Pre-Deployment Steps

### 1. Database Setup

Run Prisma migrations to set up your database schema:

```bash
# Generate Prisma Client
npx prisma generate

# Push schema to database
npx prisma db push

# Optional: Seed initial data
npx prisma db seed
```

### 2. Supabase Storage Setup

Create a storage bucket for documents:

1. Go to Supabase Dashboard → Storage
2. Create a new bucket named `documents`
3. Set bucket to **Private** (not public)
4. Configure Row Level Security (RLS) policies:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND (storage.foldername(name))[1] = auth.uid()::text);
```

### 3. Build and Test Locally

```bash
# Install dependencies
npm install

# Build the application
npm run build

# Test the production build locally
npm start
```

Verify that:
- ✅ Application builds without errors
- ✅ All pages load correctly
- ✅ Authentication works
- ✅ File upload/download works
- ✅ Payment flow works (use Razorpay test mode)

## Deployment to Vercel

### Option 1: Deploy via Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy to production
vercel --prod
```

### Option 2: Deploy via Git Integration

1. Push your code to GitHub/GitLab/Bitbucket
2. Import project in Vercel Dashboard
3. Configure environment variables
4. Deploy

### Vercel Configuration

The project includes automatic configuration via `next.config.ts`. Verify these settings:

- ✅ Security headers enabled
- ✅ CORS policies configured
- ✅ Image optimization for Supabase domains
- ✅ Webpack configuration for PDF.js

## Post-Deployment Verification

### 1. Security Checklist

- [ ] HTTPS is enforced (automatic with Vercel)
- [ ] Security headers are present (check with securityheaders.com)
- [ ] Cookies are secure and HTTP-only
- [ ] CORS policies are restrictive
- [ ] Rate limiting is functional
- [ ] Input sanitization is working
- [ ] SQL injection protection via Prisma
- [ ] XSS protection via React and sanitization

Test security headers:
```bash
curl -I https://your-domain.com
```

Expected headers:
- `Strict-Transport-Security`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection`
- `Referrer-Policy`

### 2. Functionality Testing

Test these critical flows in production:

- [ ] User registration and login
- [ ] Document upload (test file size limits)
- [ ] Document deletion
- [ ] Share link creation
- [ ] Password-protected share links
- [ ] PDF viewer with DRM protection
- [ ] Watermark display
- [ ] View analytics tracking
- [ ] Subscription upgrade (use test mode first)
- [ ] Payment verification

### 3. Performance Testing

- [ ] Lighthouse score > 90
- [ ] First Contentful Paint < 1.5s
- [ ] Time to Interactive < 3.5s
- [ ] PDF loading time acceptable
- [ ] API response times < 500ms

### 4. Error Monitoring Setup

If using Sentry or similar:

```bash
# Install Sentry SDK
npm install @sentry/nextjs

# Initialize Sentry
npx @sentry/wizard -i nextjs
```

Configure error tracking in `lib/logger.ts` to send errors to your monitoring service.

## Production Best Practices

### Security

1. **Regular Updates**
   - Update dependencies monthly: `npm audit fix`
   - Monitor security advisories
   - Update Node.js version regularly

2. **Access Control**
   - Limit Vercel project access to necessary team members
   - Use separate Supabase projects for dev/staging/prod
   - Rotate API keys quarterly

3. **Monitoring**
   - Set up uptime monitoring (e.g., UptimeRobot)
   - Configure error alerts
   - Monitor API rate limits
   - Track storage usage

### Performance

1. **Database Optimization**
   - Enable Supabase connection pooling
   - Monitor slow queries
   - Add indexes for frequently queried fields

2. **Storage Optimization**
   - Set up CDN for static assets
   - Compress PDFs before upload (client-side)
   - Clean up orphaned files regularly

3. **Caching**
   - Use Vercel Edge caching for static pages
   - Cache signed URLs (1-hour TTL)
   - Implement Redis for rate limiting (optional)

### Backup and Recovery

1. **Database Backups**
   - Enable Supabase automatic backups
   - Test restore procedure quarterly
   - Keep backups for 30 days minimum

2. **Storage Backups**
   - Configure Supabase Storage backups
   - Consider cross-region replication for critical data

3. **Disaster Recovery Plan**
   - Document recovery procedures
   - Test failover scenarios
   - Maintain emergency contact list

## Scaling Considerations

### When to Scale

Monitor these metrics:
- Database connection pool exhaustion
- Storage approaching limits
- API response times increasing
- Error rates increasing

### Scaling Options

1. **Database**: Upgrade Supabase plan or migrate to dedicated PostgreSQL
2. **Storage**: Upgrade Supabase Storage or migrate to S3
3. **Compute**: Vercel automatically scales, but monitor function execution limits
4. **CDN**: Enable Vercel Edge Network for global distribution

## Troubleshooting

### Common Issues

**Build Failures**
```bash
# Clear cache and rebuild
vercel --force
```

**Database Connection Issues**
- Verify `DATABASE_URL` includes `?pgbouncer=true`
- Check Supabase connection limits
- Use `DIRECT_URL` for migrations

**Storage Upload Failures**
- Verify Supabase service role key
- Check bucket permissions
- Verify file size limits

**Payment Verification Failures**
- Verify Razorpay webhook signature
- Check Razorpay key_id matches
- Test with Razorpay test mode first

### Support Resources

- Vercel Documentation: https://vercel.com/docs
- Supabase Documentation: https://supabase.com/docs
- Next.js Documentation: https://nextjs.org/docs
- Razorpay Documentation: https://razorpay.com/docs

## Maintenance Schedule

### Daily
- Monitor error logs
- Check uptime status

### Weekly
- Review analytics and usage metrics
- Check storage usage trends
- Review security logs

### Monthly
- Update dependencies
- Review and rotate logs
- Performance audit
- Security audit

### Quarterly
- Rotate API keys and secrets
- Review and update documentation
- Disaster recovery drill
- Cost optimization review

## Rollback Procedure

If deployment issues occur:

1. **Immediate Rollback**
   ```bash
   # Via Vercel Dashboard: Deployments → Previous deployment → Promote to Production
   # Or via CLI:
   vercel rollback
   ```

2. **Database Rollback**
   ```bash
   # Restore from Supabase backup
   # Follow Supabase documentation for point-in-time recovery
   ```

3. **Verify Rollback**
   - Test critical user flows
   - Check error rates
   - Verify database integrity

## Contact and Support

For deployment issues or questions:
- Technical Lead: [email]
- DevOps Team: [email]
- Emergency Hotline: [phone]

---

**Last Updated**: November 2025
**Version**: 1.0.0
