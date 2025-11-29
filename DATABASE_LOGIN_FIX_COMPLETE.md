# Database & Login Fix - Complete Solution

## Date: November 29, 2025

## Problems Identified

### 1. **Wrong Database Port**
- Was using port `6543` (transaction pooler)
- Should use port `5432` (session pooler)

### 2. **Password Encoding Issue**
- Password `FlipBook123!` was not URL-encoded
- The `!` character must be encoded as `%21`

### 3. **Database URL Override in lib/db.ts**
- Custom URL logic was overriding Prisma's datasource configuration
- This prevented proper separation of pooler (runtime) vs direct (migrations)

### 4. **No Error Handling for DB Failures**
- Login would fail silently when database was unreachable
- No user-friendly error messages

## Solutions Applied

### ✅ Fix 1: Corrected Database Connection Strings

**Updated `.env` and `.env.local`:**

```env
# Session Pooler (for app runtime)
DATABASE_URL="postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123%21@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require"

# Direct Connection (ONLY for Prisma CLI)
DIRECT_URL="postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123%21@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres?sslmode=require"
```

**Key Changes:**
- ✅ Port changed from `6543` → `5432`
- ✅ Password encoded: `FlipBook123!` → `FlipBook123%21`
- ✅ Added `sslmode=require` to both URLs
- ✅ Kept `pgbouncer=true` for pooler URL

### ✅ Fix 2: Simplified lib/db.ts

**Removed custom URL logic** - Now Prisma uses the datasource URLs from `schema.prisma` correctly:

```typescript
export const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  // Let Prisma use the datasource URLs from schema.prisma
  // Do NOT override the URL here
})
```

**How it works:**
- Runtime queries → Uses `DATABASE_URL` (session pooler)
- Migrations/db pull → Uses `DIRECT_URL` (direct connection)
- Prisma handles this automatically via `schema.prisma` datasource config

### ✅ Fix 3: Added Robust Error Handling to Auth

**Updated `lib/auth.ts`** with comprehensive error handling:

```typescript
try {
  user = await prisma.user.findUnique({ ... });
} catch (dbError: any) {
  logger.error('Database error during login', {
    email: credentials.email,
    error: dbError.message,
    code: dbError.code
  });
  
  // Check if it's a connection error
  if (dbError.code === 'P1001' || dbError.message?.includes("Can't reach database")) {
    throw new Error("Database temporarily unavailable. Please try again in a few seconds.");
  }
  
  throw new Error("Login service temporarily unavailable. Please try again.");
}
```

**Benefits:**
- ✅ Clear error messages for users
- ✅ Detailed logging for debugging
- ✅ Distinguishes between connection errors and other DB issues
- ✅ Prevents silent failures

### ✅ Fix 4: Enhanced Database Connection Testing

**Added retry logic** to `testDatabaseConnection()`:

```typescript
export async function testDatabaseConnection(maxRetries = 3): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await prisma.$connect()
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error: any) {
      // Exponential backoff retry logic
      if (attempt < maxRetries) {
        const waitTime = Math.min(1000 * Math.pow(2, attempt - 1), 5000)
        await new Promise(resolve => setTimeout(resolve, waitTime))
      }
    }
  }
  return false
}
```

## How DATABASE_URL vs DIRECT_URL Work

### DATABASE_URL (Session Pooler)
- **Used by:** Application runtime (Next.js, API routes)
- **Host:** `aws-1-ap-south-1.pooler.supabase.com:5432`
- **Purpose:** Connection pooling for efficient resource usage
- **When:** All `prisma.user.findUnique()`, `prisma.document.create()`, etc.

### DIRECT_URL (Direct Connection)
- **Used by:** Prisma CLI only
- **Host:** `db.zuhrivibcgudgsejsljo.supabase.co:5432`
- **Purpose:** Direct database access for schema operations
- **When:** `npx prisma migrate`, `npx prisma db pull`, `npx prisma db push`

### Automatic Separation
Prisma automatically uses the right URL based on context:
```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")      # Runtime
  directUrl = env("DIRECT_URL")        # Migrations
}
```

## Session Strategy

**Current Configuration:** JWT-based sessions

```typescript
session: {
  strategy: "jwt",
  maxAge: 30 * 24 * 60 * 60 // 30 days
}
```

**Why JWT:**
- ✅ No database queries for session validation
- ✅ Works even if database is temporarily unavailable
- ✅ Scales better (no session table needed)
- ✅ Simpler deployment (no session cleanup needed)

**Session Data Stored:**
- User ID, email, name
- Role, userRole, additionalRoles
- Email verification status
- Account active status

## Testing Instructions

### Local Development

1. **Clean restart:**
   ```bash
   # Stop all processes
   # Delete .next folder
   rm -rf .next
   
   # Reinstall if needed
   npm install
   
   # Generate Prisma client
   npx prisma generate
   
   # Start dev server
   npm run dev
   ```

2. **Test database connection:**
   ```bash
   npx tsx scripts/test-pooler-connection.ts
   ```

3. **Test login:**
   - Navigate to http://localhost:3000/login
   - Try logging in with valid credentials
   - Check console for any errors

### Production (Vercel)

1. **Update environment variables in Vercel:**
   ```
   DATABASE_URL=postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123%21@aws-1-ap-south-1.pooler.supabase.com:5432/postgres?pgbouncer=true&sslmode=require
   
   DIRECT_URL=postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123%21@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres?sslmode=require
   
   NEXTAUTH_URL=https://jstudyroom.dev
   NEXTAUTH_SECRET=Qx13aG3EUedHk21Y4iX60Zqs0So3KmfqULb1MafTYIc=
   ```

2. **Redeploy:**
   - Push to GitHub
   - Vercel will auto-deploy
   - Or manually trigger deployment in Vercel dashboard

3. **Verify:**
   - Check https://jstudyroom.dev/api/health
   - Should show `"database": "connected"`
   - Test login at https://jstudyroom.dev/login

## Windows-Specific Prisma Issues

### EPERM / Permission Denied Errors

If you encounter `EPERM` errors with `query_engine-windows.dll.node`:

1. **Stop all Node processes:**
   - Close VS Code
   - Kill all node.exe processes in Task Manager
   - Close any terminals running npm/prisma

2. **Clean Prisma cache:**
   ```bash
   rm -rf node_modules/.prisma
   rm -rf node_modules/@prisma
   ```

3. **Reinstall:**
   ```bash
   npm install
   npx prisma generate
   ```

4. **If still failing:**
   - Restart Windows
   - Run as Administrator
   - Check antivirus isn't blocking Prisma

## Monitoring & Debugging

### Health Check Endpoint
```
GET /api/health
```

Returns:
```json
{
  "status": "ok",
  "timestamp": "2025-11-29T...",
  "database": "connected",
  "env": {
    "DATABASE_URL": true,
    "NEXTAUTH_URL": true,
    ...
  }
}
```

### Login Error Messages

Users will now see clear error messages:

- ❌ "Email and password are required"
- ❌ "Invalid email or password"
- ❌ "Account is inactive. Please contact support."
- ❌ "Database temporarily unavailable. Please try again in a few seconds."
- ❌ "Too many login attempts. Please try again in X seconds."

### Server Logs

Check logs for:
```
✅ Successful login: { userId, email, userRole }
⚠️ Login attempt with invalid email: { email }
⚠️ Login attempt with invalid password: { email, userId }
❌ Database error during login: { email, error, code }
```

## Expected Behavior

### ✅ Local Development
- `npm run dev` starts without errors
- Login works consistently
- Database queries succeed
- No "Can't reach database" errors

### ✅ Production (Vercel)
- Login works reliably at https://jstudyroom.dev
- No random login failures
- Health check shows database connected
- Sessions persist correctly

## Rollback Plan

If issues persist, you can rollback by:

1. Reverting `lib/db.ts` to use DIRECT_URL temporarily
2. Checking Supabase dashboard for database health
3. Verifying network connectivity to Supabase pooler
4. Contacting Supabase support if pooler is unreachable

## Summary

All fixes have been applied to ensure:
- ✅ Correct database connection strings (pooler for runtime, direct for migrations)
- ✅ Proper password URL encoding
- ✅ Simplified Prisma client initialization
- ✅ Robust error handling with user-friendly messages
- ✅ Clear separation of concerns (DATABASE_URL vs DIRECT_URL)
- ✅ JWT-based sessions for reliability
- ✅ Comprehensive logging and monitoring

**The application should now have stable, reliable login functionality both locally and in production.**
