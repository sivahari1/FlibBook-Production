# Deployment Guide

## Overview

This guide covers deploying the Flipbook & Media Annotations system to production.

---

## Prerequisites

### Required Accounts

- [ ] Vercel account
- [ ] Supabase account
- [ ] GitHub account
- [ ] Domain name (optional)

### Required Tools

```bash
# Node.js 18+
node --version

# npm or yarn
npm --version

# Vercel CLI
npm install -g vercel

# Prisma CLI
npm install -g prisma
```

---

## Environment Setup

### Environment Variables

Create `.env.production` file:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database?pgbouncer=true"
DIRECT_URL="postgresql://user:password@host:5432/database"

# NextAuth
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key-here"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Storage Buckets
SUPABASE_DOCUMENT_PAGES_BUCKET="document-pages"
SUPABASE_DOCUMENT_MEDIA_BUCKET="document-media"

# Feature Flags
NEXT_PUBLIC_ENABLE_ANNOTATIONS="true"
NEXT_PUBLIC_ENABLE_FLIPBOOK="true"

# Performance
NEXT_PUBLIC_MAX_UPLOAD_SIZE="104857600" # 100MB
NEXT_PUBLIC_PAGE_CACHE_TTL="604800" # 7 days

# Monitoring (optional)
SENTRY_DSN="your-sentry-dsn"
VERCEL_ANALYTICS_ID="your-analytics-id"
```

### Vercel Environment Variables

Add environment variables in Vercel dashboard:

1. Go to Project Settings → Environment Variables
2. Add all variables from `.env.production`
3. Set appropriate scopes (Production, Preview, Development)

---

## Database Setup

### 1. Create Supabase Project

```bash
# Login to Supabase
npx supabase login

# Initialize project
npx supabase init

# Link to remote project
npx supabase link --project-ref your-project-ref
```

### 2. Run Migrations

```bash
# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate deploy

# Verify migration
npx prisma migrate status
```

### 3. Seed Database (Optional)

```bash
# Run seed script
npx prisma db seed
```

---

## Storage Setup

### 1. Create Storage Buckets

```bash
# Run setup script
npm run setup:storage
```

Or manually in Supabase dashboard:

1. Go to Storage → Create bucket
2. Create `document-pages` bucket (private)
3. Create `document-media` bucket (private)

### 2. Configure RLS Policies

```sql
-- Document Pages Bucket
CREATE POLICY "Users can view their document pages"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'document-pages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their document pages"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'document-pages' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Document Media Bucket
CREATE POLICY "Users can view their media"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'document-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can upload their media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'document-media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Configure CORS

In Supabase dashboard → Storage → Configuration:

```json
{
  "allowedOrigins": ["https://your-domain.com"],
  "allowedMethods": ["GET", "POST", "PUT", "DELETE"],
  "allowedHeaders": ["*"],
  "maxAgeSeconds": 3600
}
```

---

## Vercel Deployment

### 1. Connect GitHub Repository

1. Go to Vercel dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Configure project settings

### 2. Configure Build Settings

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "devCommand": "npm run dev"
}
```

### 3. Deploy

```bash
# Deploy to production
vercel --prod

# Or push to main branch (auto-deploy)
git push origin main
```

---

## Post-Deployment Steps

### 1. Verify Deployment

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs
```

### 2. Run Smoke Tests

```bash
# Test API endpoints
curl https://your-domain.com/api/health

# Test document conversion
curl -X POST https://your-domain.com/api/documents/convert \
  -H "Content-Type: application/json" \
  -d '{"documentId": "test-doc"}'

# Test annotations
curl https://your-domain.com/api/annotations?documentId=test-doc
```

### 3. Monitor Performance

- Check Vercel Analytics
- Monitor error rates
- Review response times
- Check database performance

---

## Database Migration

### Production Migration Checklist

- [ ] Backup current database
- [ ] Test migration on staging
- [ ] Schedule maintenance window
- [ ] Run migration
- [ ] Verify data integrity
- [ ] Monitor for errors
- [ ] Rollback plan ready

### Migration Script

```bash
#!/bin/bash

# Backup database
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migration
npx prisma migrate deploy

# Verify migration
npx prisma migrate status

# Check for errors
if [ $? -eq 0 ]; then
  echo "Migration successful"
else
  echo "Migration failed - rolling back"
  psql $DATABASE_URL < backup_*.sql
fi
```

---

## Rollback Procedures

### Application Rollback

```bash
# Rollback to previous deployment
vercel rollback

# Or redeploy specific version
vercel --prod --force
```

### Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup_20241201_120000.sql

# Or use Supabase point-in-time recovery
# (Available in Supabase dashboard)
```

### Storage Rollback

```bash
# Restore files from backup
# (Supabase Storage has versioning enabled)
```

---

## Monitoring Setup

### 1. Error Tracking (Sentry)

```typescript
// sentry.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 1.0,
});
```

### 2. Performance Monitoring

```typescript
// lib/monitoring.ts
export function trackPerformance(metric: string, value: number) {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag('event', 'timing_complete', {
      name: metric,
      value: Math.round(value),
      event_category: 'Performance',
    });
  }
}
```

### 3. Uptime Monitoring

Set up monitoring with:
- Vercel Analytics
- UptimeRobot
- Pingdom
- StatusPage

---

## Security Hardening

### 1. Enable Security Headers

```typescript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'Referrer-Policy',
    value: 'origin-when-cross-origin'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },
};
```

### 2. Configure Rate Limiting

```typescript
// lib/rate-limit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(100, '1 h'),
});
```

### 3. Enable CORS

```typescript
// middleware.ts
export function middleware(request: NextRequest) {
  const response = NextResponse.next();
  
  response.headers.set('Access-Control-Allow-Origin', 'https://your-domain.com');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  return response;
}
```

---

## Performance Optimization

### 1. Enable Caching

```typescript
// app/api/annotations/route.ts
export async function GET(request: Request) {
  const response = await getAnnotations();
  
  return new Response(JSON.stringify(response), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
```

### 2. Optimize Images

```typescript
// next.config.ts
module.exports = {
  images: {
    domains: ['your-project.supabase.co'],
    formats: ['image/webp', 'image/avif'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920, 2048, 3840],
  },
};
```

### 3. Enable Compression

```typescript
// next.config.ts
module.exports = {
  compress: true,
  poweredByHeader: false,
};
```

---

## Scaling Considerations

### Horizontal Scaling

Vercel automatically scales based on traffic. No configuration needed.

### Database Scaling

1. **Connection Pooling**: Use PgBouncer
2. **Read Replicas**: Add read replicas for read-heavy workloads
3. **Caching**: Implement Redis caching layer

### Storage Scaling

Supabase Storage automatically scales. Monitor usage and upgrade plan as needed.

---

## Maintenance

### Regular Tasks

**Daily**:
- Monitor error rates
- Check performance metrics
- Review logs

**Weekly**:
- Review database performance
- Check storage usage
- Update dependencies

**Monthly**:
- Security updates
- Database optimization
- Backup verification

### Maintenance Windows

Schedule maintenance during low-traffic periods:
- Announce maintenance in advance
- Use status page for updates
- Have rollback plan ready

---

## Troubleshooting

### Common Issues

#### Deployment Fails

```bash
# Check build logs
vercel logs

# Verify environment variables
vercel env ls

# Test build locally
npm run build
```

#### Database Connection Issues

```bash
# Test connection
npx prisma db pull

# Check connection string
echo $DATABASE_URL

# Verify firewall rules
```

#### Storage Upload Fails

```bash
# Check bucket permissions
# Verify RLS policies
# Test with Supabase CLI
npx supabase storage ls document-media
```

---

## Support

For deployment support:
- Email: devops@jstudyroom.com
- Documentation: /docs/deployment
- Status Page: /status

---

Last Updated: December 1, 2024
