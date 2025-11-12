# Database Setup Guide

This guide will help you set up your Supabase PostgreSQL database for the FlipBook DRM application.

## 🔧 Prerequisites

1. Supabase account (https://supabase.com)
2. A Supabase project created
3. Node.js and npm installed

## 📋 Step-by-Step Setup

### 1. Get Supabase Connection Strings

1. Go to your Supabase project dashboard
2. Navigate to **Settings** → **Database**
3. Find the **Connection String** section
4. Copy both connection strings:

   **Connection Pooling (for application):**
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

   **Direct Connection (for migrations):**
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres
   ```

### 2. Update Environment Variables

Create or update your `.env.local` file:

```bash
# Database - Connection Pooling (for application)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"

# Database - Direct Connection (for migrations)
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# Razorpay (use test keys for development)
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="your-test-secret"
```

**Important Notes:**
- Replace `[PROJECT-REF]` with your actual Supabase project reference
- Replace `[PASSWORD]` with your database password
- The pooling URL uses port `6543` with `?pgbouncer=true`
- The direct URL uses port `5432` without pgbouncer

### 3. Generate Prisma Client

```bash
npx prisma generate
```

This creates the Prisma Client based on your schema.

### 4. Push Schema to Database

**Option A: Using Prisma DB Push (Recommended for Development)**

```bash
npx prisma db push
```

This will:
- Create all tables in your database
- Apply the schema without creating migration files
- Be faster for development

**Option B: Using Prisma Migrate (Recommended for Production)**

```bash
# Create a migration
npx prisma migrate dev --name init

# Apply migrations to production
npx prisma migrate deploy
```

### 5. Verify Database Setup

Check if tables were created:

```bash
npx prisma studio
```

This opens Prisma Studio where you can:
- View all tables
- See the schema structure
- Add test data
- Verify relationships

## 📊 Database Schema Overview

Your database will have these tables:

### Users Table
- Stores user accounts
- Tracks subscription tier
- Monitors storage usage

### Documents Table
- Stores PDF metadata
- Links to Supabase Storage
- Tracks file size and type

### ShareLinks Table
- Manages shareable links
- Stores access controls (password, expiration, view limits)
- Tracks view counts

### ViewAnalytics Table
- Records each document view
- Captures viewer information
- Stores location data

### Subscriptions Table
- Tracks payment history
- Manages subscription status
- Links to Razorpay transactions

## 🔐 Set Up Supabase Storage

### 1. Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Click **New bucket**
3. Name it: `documents`
4. Set to **Private** (not public)
5. Click **Create bucket**

### 2. Set Up Row Level Security (RLS) Policies

Run these SQL commands in the Supabase SQL Editor:

```sql
-- Allow authenticated users to upload to their own folder
CREATE POLICY "Users can upload to own folder"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to read their own files
CREATE POLICY "Users can read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow authenticated users to delete their own files
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND 
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow service role to access all files (for backend operations)
CREATE POLICY "Service role can access all files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'documents');
```

### 3. Configure Storage Settings

1. Go to **Storage** → **Policies**
2. Verify RLS is enabled
3. Check file size limits (default 50MB)
4. Configure allowed MIME types if needed

## 🧪 Test Database Connection

Create a test script `test-db.js`:

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully!');

    // Count users
    const userCount = await prisma.user.count();
    console.log(`📊 Users in database: ${userCount}`);

    // Count documents
    const docCount = await prisma.document.count();
    console.log(`📄 Documents in database: ${docCount}`);

    await prisma.$disconnect();
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

Run it:
```bash
node test-db.js
```

## 🐛 Troubleshooting

### Error: P1017 - Server has closed the connection

**Cause**: Using pooling URL for migrations

**Solution**: Make sure you're using the DIRECT_URL for migrations:
```bash
# Set environment variable temporarily
$env:DATABASE_URL=$env:DIRECT_URL
npx prisma db push
```

### Error: P1001 - Can't reach database server

**Causes**:
1. Wrong connection string
2. Firewall blocking connection
3. Database paused (Supabase free tier)

**Solutions**:
1. Verify connection string in Supabase dashboard
2. Check if your IP is allowed
3. Wake up database by visiting Supabase dashboard

### Error: P3009 - Failed to create database

**Cause**: Database already exists or permissions issue

**Solution**: Use `db push` instead of `migrate`:
```bash
npx prisma db push --accept-data-loss
```

### Connection Timeout

**Cause**: Network issues or wrong port

**Solutions**:
1. Check if you're using correct port (6543 for pooling, 5432 for direct)
2. Try direct connection URL
3. Check Supabase project status

## 🔄 Reset Database (Development Only)

**⚠️ WARNING: This will delete all data!**

```bash
# Reset database
npx prisma migrate reset

# Or manually drop all tables in Supabase SQL Editor:
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

# Then push schema again
npx prisma db push
```

## 📝 Seed Database (Optional)

Create `prisma/seed.ts`:

```typescript
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      passwordHash: hashedPassword,
      name: 'Test User',
      subscription: 'free',
      storageUsed: 0,
    },
  });

  console.log('✅ Seed user created:', user.email);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to `package.json`:
```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```

Run seed:
```bash
npx prisma db seed
```

## ✅ Verification Checklist

- [ ] Supabase project created
- [ ] Connection strings copied
- [ ] Environment variables set in `.env.local`
- [ ] Prisma client generated (`npx prisma generate`)
- [ ] Schema pushed to database (`npx prisma db push`)
- [ ] Tables visible in Prisma Studio
- [ ] Storage bucket created (`documents`)
- [ ] RLS policies applied
- [ ] Test connection successful
- [ ] Can create test user

## 🚀 Next Steps

Once database is set up:

1. Start development server:
   ```bash
   npm run dev
   ```

2. Test user registration at http://localhost:3000/register

3. Test document upload in dashboard

4. Verify data in Prisma Studio:
   ```bash
   npx prisma studio
   ```

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Guide](https://supabase.com/docs/guides/storage)
- [Prisma with Supabase](https://supabase.com/docs/guides/integrations/prisma)

---

**Last Updated**: November 2025  
**Need Help?** Check the troubleshooting section or contact support.
