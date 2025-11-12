# Quick Start Guide

Get your FlipBook DRM application up and running in 15 minutes!

## 🚀 Prerequisites

- Node.js 18+ installed
- Supabase account (free tier works)
- Razorpay account (for payments)
- Git installed

## ⚡ Quick Setup (15 minutes)

### Step 1: Install Dependencies (2 minutes)

```bash
npm install
```

### Step 2: Configure Environment Variables (5 minutes)

Create `.env.local` file in the root directory:

```bash
# Copy the template
cp .env.example .env.local
```

Edit `.env.local` with your credentials:

```bash
# Database (Get from Supabase Dashboard → Settings → Database)
DATABASE_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-1-ap-south-1.pooler.supabase.com:5432/postgres"

# Supabase (Get from Supabase Dashboard → Settings → API)
NEXT_PUBLIC_SUPABASE_URL="https://[PROJECT-REF].supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key-here"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="run-this-command-openssl-rand-base64-32"

# Razorpay (Get from Razorpay Dashboard → Settings → API Keys)
RAZORPAY_KEY_ID="rzp_test_xxxxx"
RAZORPAY_KEY_SECRET="your-test-secret-here"
```

**Generate NEXTAUTH_SECRET**:
```bash
# On Windows PowerShell
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# On Mac/Linux
openssl rand -base64 32
```

### Step 3: Set Up Database (3 minutes)

```bash
# Generate Prisma Client
npx prisma generate

# Create database tables
npx prisma db push

# Open Prisma Studio to verify (optional)
npx prisma studio
```

### Step 4: Set Up Supabase Storage (3 minutes)

1. Go to Supabase Dashboard → **Storage**
2. Click **New bucket**
3. Name: `documents`
4. Make it **Private**
5. Click **Create**

6. Go to **SQL Editor** and run:

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

-- Allow service role to access all files
CREATE POLICY "Service role can access all files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'documents');
```

### Step 5: Start Development Server (1 minute)

```bash
npm run dev
```

Open http://localhost:3000 in your browser!

### Step 6: Test the Application (1 minute)

1. **Register**: Go to http://localhost:3000/register
   - Email: test@example.com
   - Password: password123
   - Name: Test User

2. **Login**: You'll be redirected to dashboard

3. **Upload PDF**: Click "Upload Document" and select a PDF

4. **Create Share Link**: Click on a document → "Share" button

5. **View PDF**: Copy the share link and open in new tab

## ✅ Verification Checklist

- [ ] Dependencies installed
- [ ] `.env.local` configured with all variables
- [ ] Database tables created (check with `npx prisma studio`)
- [ ] Supabase storage bucket created
- [ ] RLS policies applied
- [ ] Development server running
- [ ] Can register new user
- [ ] Can login
- [ ] Can upload PDF
- [ ] Can create share link
- [ ] Can view PDF with watermark

## 🐛 Common Issues

### Issue: "P1017: Server has closed the connection"

**Solution**: You're using the pooling URL for migrations. Use direct URL:

```bash
# Windows PowerShell
$env:DATABASE_URL=$env:DIRECT_URL
npx prisma db push
```

### Issue: "Cannot find module '@prisma/client'"

**Solution**: Generate Prisma Client:

```bash
npx prisma generate
```

### Issue: "Upload failed: Invalid bucket"

**Solution**: Create the `documents` bucket in Supabase Storage

### Issue: "NEXTAUTH_SECRET is not set"

**Solution**: Generate and add to `.env.local`:

```bash
# Generate secret
openssl rand -base64 32

# Add to .env.local
NEXTAUTH_SECRET="your-generated-secret"
```

### Issue: Port 3000 already in use

**Solution**: Kill the process or use different port:

```bash
# Use different port
npm run dev -- -p 3001
```

## 📚 Next Steps

### Explore Features

1. **Dashboard**: http://localhost:3000/dashboard
   - Upload documents
   - View storage usage
   - Manage documents

2. **Share Links**: 
   - Create password-protected links
   - Set expiration dates
   - Limit view counts

3. **Analytics**: 
   - View document analytics
   - Track viewer information
   - See view timeline

4. **Subscriptions**: http://localhost:3000/dashboard/subscription
   - View plans
   - Test payment flow (use Razorpay test mode)

### Test Features

```bash
# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'

# Test document upload (after login)
# Use the dashboard UI for easier testing
```

### Development Tools

```bash
# View database
npx prisma studio

# Check TypeScript errors
npm run type-check

# Build for production
npm run build

# Run production build locally
npm start
```

## 🔧 Configuration Options

### Adjust File Size Limit

Edit `lib/validation.ts`:

```typescript
export const MAX_FILE_SIZE = 50 * 1024 * 1024; // Change to desired size
```

### Adjust Rate Limits

Edit `middleware.ts`:

```typescript
// Auth endpoints
const allowed = rateLimit(`auth:${ip}`, 5, 60000); // Change 5 to desired limit

// API endpoints
const allowed = rateLimit(`api:${ip}`, 100, 60000); // Change 100 to desired limit
```

### Adjust Subscription Plans

Edit `lib/razorpay.ts`:

```typescript
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    price: 0,
    storage: 100 * 1024 * 1024, // Change storage limit
    maxDocuments: 5, // Change document limit
  },
  // ... other plans
};
```

## 🚀 Deploy to Production

When ready to deploy:

1. **Read Deployment Guide**: See `DEPLOYMENT.md`

2. **Update Environment Variables**: Use production values

3. **Deploy to Vercel**:
   ```bash
   npm i -g vercel
   vercel login
   vercel --prod
   ```

4. **Configure Domain**: Set up custom domain in Vercel

5. **Test Production**: Run through all features

## 📖 Documentation

- **Full Deployment Guide**: `DEPLOYMENT.md`
- **Database Setup**: `DATABASE_SETUP.md`
- **Security Policy**: `SECURITY.md`
- **Feature Comparison**: `FEATURE_COMPARISON.md`
- **Project Status**: `PROJECT_STATUS.md`

## 💡 Tips

1. **Use Prisma Studio**: Great for viewing and editing database data
   ```bash
   npx prisma studio
   ```

2. **Check Logs**: Monitor console for errors and warnings

3. **Test with Real PDFs**: Use various PDF sizes and types

4. **Test Share Links**: Try different combinations of password, expiration, and view limits

5. **Test Payments**: Use Razorpay test cards:
   - Card: 4111 1111 1111 1111
   - CVV: Any 3 digits
   - Expiry: Any future date

## 🎉 You're Ready!

Your FlipBook DRM application is now running locally. Start exploring the features and building your PDF sharing platform!

**Need Help?**
- Check `DATABASE_SETUP.md` for database issues
- Check `DEPLOYMENT.md` for deployment questions
- Check `SECURITY.md` for security concerns
- Check `PROJECT_STATUS.md` for feature status

---

**Happy Coding! 🚀**
