# Supabase Setup Guide for FlipBook Production

This guide will help you set up Supabase for the FlipBook application.

## Step 1: Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Sign in or create an account
3. Click "New Project"
4. Fill in the details:
   - **Name**: flipbook-production (or your preferred name)
   - **Database Password**: Create a strong password (password:FlipBook123!)
   - **Region**: Choose closest to your users (e.g., Mumbai for India)
5. Click "Create new project"
6. Wait for the project to be created (takes 1-2 minutes)

## Step 2: Get Your Database Connection Strings

1. In your Supabase project dashboard, go to **Settings** → **Database**
2. Scroll down to **Connection string** section
3. You'll need TWO connection strings:

### Connection Pooling URL (for DATABASE_URL)
- Select **Connection Pooling** → **Transaction Mode**
- Copy the connection string
- It looks like: `postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true`
- Replace `[YOUR-PASSWORD]` with your actual database password

   postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123!@aws-1-ap-south-1.pooler.supabase.com:6543/postgres

### Direct Connection URL (for DIRECT_URL)
- Select **Direct Connection** → **URI**
- Copy the connection string
- It looks like: `postgresql://postgres.xxx:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`
- Replace `[YOUR-PASSWORD]` with your actual database password

 postgresql://postgres:FlipBook123!@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres

## Step 3: Get Your Supabase API Keys

1. Go to **Settings** → **API**
2. Copy the following:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: Starts with `eyJ...`
   - **service_role key**: Starts with `eyJ...` (keep this secret!)

project url:

https://zuhrivibcgudgsejsljo.supabase.co

annon public key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aHJpdmliY2d1ZGdzZWpzbGpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI1ODk3OTEsImV4cCI6MjA3ODE2NTc5MX0.VRnhvOJ5iRbfiz1VsY1aBL7A5H3CIXMDYKqLJdNJSNI

service role: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp1aHJpdmliY2d1ZGdzZWpzbGpvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjU4OTc5MSwiZXhwIjoyMDc4MTY1NzkxfQ.nq77fuIaIGnWsOjQ6AO-S9eevLVlDBTm9nDdWnbPUME


## Step 4: Update Your .env.local File

Open `flipbook-production/.env.local` and update these values:

```bash
# Database - Replace with your actual Supabase credentials
DATABASE_URL="postgresql://postgres.xxx:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.xxx:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres"

# Supabase - Replace with your project details
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key-here"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# NextAuth - Generate a secret
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run: openssl rand -base64 32"

# Razorpay - Get from Razorpay dashboard
RAZORPAY_KEY_ID="rzp_test_xxx"
RAZORPAY_KEY_SECRET="your-test-secret"
NEXT_PUBLIC_RAZORPAY_KEY_ID="rzp_test_xxx"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Step 5: Set Up Supabase Storage

1. In your Supabase dashboard, go to **Storage**
2. Click "Create a new bucket"
3. Name it: `documents`
4. Make it **Private** (not public)
5. Click "Create bucket"

### Set Storage Policies

1. Click on the `documents` bucket
2. Go to **Policies** tab
3. Click "New Policy"
4. Create these policies:

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Policy 2: Allow users to read their own files**
```sql
CREATE POLICY "Allow users to read own files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

**Policy 3: Allow users to delete their own files**
```sql
CREATE POLICY "Allow users to delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Step 6: Generate NextAuth Secret

Run this command in your terminal:

```bash
openssl rand -base64 32
```

Copy the output and paste it as your `NEXTAUTH_SECRET` in `.env.local`

## Step 7: Run Database Migrations

Once you've updated `.env.local` with all the correct values, run:

```bash
cd flipbook-production
npx prisma generate
npx prisma db push
```

This will:
1. Generate the Prisma client
2. Create all the necessary tables in your Supabase database

## Step 8: Verify Setup

Run the development server:

```bash
npm run dev
```

Visit `http://localhost:3000` - if you see the landing page without errors, you're all set!

## Troubleshooting

### "Can't reach database server"
- Check that your DATABASE_URL and DIRECT_URL are correct
- Make sure you replaced `[YOUR-PASSWORD]` with your actual password
- Verify your Supabase project is running (green status in dashboard)

### "Invalid API key"
- Double-check your SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY
- Make sure there are no extra spaces or quotes

### Storage upload fails
- Verify the `documents` bucket exists
- Check that storage policies are set up correctly
- Ensure the bucket is set to Private, not Public

## Next Steps

Once setup is complete, you can:
1. Register a new user account
2. Upload PDF documents
3. Create share links
4. View analytics

For production deployment to Vercel, you'll need to add all these environment variables to your Vercel project settings.
