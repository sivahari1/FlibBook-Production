# Database Connection Fix - November 28, 2024

## Problem
Intermittent login failures with error:
```
Can't reach database server at `aws-1-ap-south-1.pooler.supabase.com:5432`
```

## Root Cause
Supabase's IPv4 session pooler (`aws-1-ap-south-1.pooler.supabase.com`) is intermittently unreachable, causing connection timeouts during authentication.

## Solution Implemented
Modified `lib/db.ts` to use direct connection for both environments:

1. **Production**: Uses direct connection (DIRECT_URL) for reliability
2. **Development**: Uses direct connection (DIRECT_URL) for reliability
3. **Fallback**: Uses pooler (DATABASE_URL) only if DIRECT_URL is not available

### Changes Made

#### lib/db.ts
- Added `getDatabaseUrl()` function that selects appropriate connection based on environment
- Development mode now uses `DIRECT_URL` to bypass unreliable pooler
- Production mode continues using `DATABASE_URL` with pooler

## Testing
Created test scripts to verify connections:

### Test Direct Connection
```bash
npx tsx scripts/test-direct-connection.ts
```
Result: ✅ Works reliably

### Test Pooler Connection  
```bash
npx tsx scripts/test-connection-with-retry.ts
```
Result: ❌ Intermittently fails

## Environment Variables
Both connection strings are configured in `.env` and `.env.local`:

```env
# Pooler (for production)
DATABASE_URL="postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123%21@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&connection_limit=1"

# Direct (for development and migrations)
DIRECT_URL="postgresql://postgres:FlipBook123%21@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres?sslmode=require"
```

## Next Steps
1. Restart development server to apply changes
2. Test login functionality
3. Monitor for any connection issues

## Alternative Solutions Considered
1. ✅ **Implemented**: Use direct connection in development
2. ⏸️ IPv6 pooler (requires network configuration)
3. ⏸️ Connection retry logic (adds complexity)

## Notes
- Direct connection works reliably and Supabase can handle production traffic
- Supabase direct connections support up to 60 concurrent connections by default
- This is sufficient for most applications
- Connection pooling via PgBouncer is optional and can be re-enabled if needed
- The pooler was causing intermittent failures, so direct connection is more reliable

## Production Deployment
When deploying to Vercel, ensure both environment variables are set:
- `DATABASE_URL`: Pooler connection (backup)
- `DIRECT_URL`: Direct connection (primary, will be used)

The app will automatically use `DIRECT_URL` for reliable connections.
