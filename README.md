# FlipBook DRM - Production Ready Application

A secure PDF sharing platform with DRM protection, watermarking, analytics, and subscription management.

## Features

- 🔐 **Secure Authentication** - User registration and login with NextAuth
- ✉️ **Email Verification** - Verify email addresses during registration
- 🔑 **Password Reset** - Secure password recovery via email
- 📄 **PDF Upload & Management** - Upload and organize PDF documents
- 🔗 **Advanced Sharing** - Link shares and email shares with access controls
- 📥 **Inbox System** - View all documents shared with you
- 💧 **Dynamic Watermarking** - Automatic watermarks with viewer information
- 📊 **View Analytics** - Track who viewed your documents and when
- 🛡️ **DRM Protection** - Prevent unauthorized copying and downloading
- 💳 **Subscription Plans** - Free, Pro, and Enterprise tiers with Razorpay
- 🚀 **Production Ready** - Built for deployment on Vercel with Supabase

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes (Serverless)
- **Database**: Supabase PostgreSQL with Prisma ORM
- **Storage**: Supabase Storage
- **Authentication**: NextAuth.js
- **Payment**: Razorpay
- **PDF Rendering**: PDF.js

## Getting Started

### Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works)
- A Razorpay account (for payments)

### Installation

1. **Clone and install dependencies**:
```bash
cd flipbook-production
npm install
```

2. **Set up Supabase**:
   - Follow the detailed guide in `SUPABASE_SETUP_GUIDE.md`
   - Create a Supabase project
   - Get your database connection strings
   - Set up storage bucket
   - Configure storage policies

3. **Set up email service (Resend)**:
   - Create a free account at [resend.com](https://resend.com)
   - Get your API key from the dashboard
   - Add and verify your domain (or use Resend's test domain for development)
   - Configure DNS records (SPF, DKIM, DMARC) for production
   - See detailed setup in the "Email Service Setup" section below

4. **Configure environment variables**:
   - Copy `.env.example` to `.env.local`
   - Update all values with your Supabase credentials
   - Add your Resend API key and from email address
   - Generate a NextAuth secret: `openssl rand -base64 32`
   - Generate a cron secret: `openssl rand -hex 32`
   - Add your Razorpay keys

5. **Set up the database**:
```bash
npx prisma generate
npx prisma db push
```

6. **Mark existing users as verified** (if migrating):
```bash
npx tsx prisma/mark-existing-users-verified.ts
```

7. **Run the development server**:
```bash
npm run dev
```

8. **Open your browser**:
   - Visit `http://localhost:3000`
   - Register a new account
   - Check your email for verification link
   - Start uploading and sharing PDFs!

## Project Structure

```
flipbook-production/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # User dashboard
│   ├── view/              # Public document viewer
│   └── page.tsx           # Landing page
├── components/            # React components
│   ├── auth/             # Authentication components
│   ├── pdf/              # PDF viewer components
│   ├── security/         # DRM protection components
│   ├── ui/               # UI components
│   └── layout/           # Layout components
├── lib/                   # Utility functions
│   ├── db.ts             # Database connection
│   ├── auth.ts           # NextAuth configuration
│   └── storage.ts        # Supabase Storage utilities
├── prisma/               # Database schema
│   └── schema.prisma     # Prisma schema definition
├── types/                # TypeScript type definitions
└── hooks/                # Custom React hooks
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint
- `npx prisma studio` - Open Prisma Studio (database GUI)
- `npx prisma db push` - Push schema changes to database
- `npx prisma generate` - Generate Prisma client

## Deployment to Vercel

1. **Push your code to GitHub**:
```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Vercel will auto-detect Next.js

3. **Add environment variables**:
   - In Vercel project settings, go to "Environment Variables"
   - Add all variables from your `.env.local`
   - Make sure to update URLs for production

4. **Deploy**:
   - Vercel will automatically deploy
   - Your app will be live at `https://your-project.vercel.app`

## Environment Variables

Required environment variables (see `.env.example` for details):

- `DATABASE_URL` - Supabase connection pooling URL
- `DIRECT_URL` - Supabase direct connection URL
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXTAUTH_URL` - Your app URL
- `NEXTAUTH_SECRET` - Random secret for NextAuth
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay secret key
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Razorpay public key
- `RESEND_API_KEY` - Resend API key for email service
- `RESEND_FROM_EMAIL` - Email address for sending emails
- `CRON_SECRET` - Secret for securing cron job endpoints

## Features in Detail

### Authentication & Email Verification
- Secure registration with email and password
- Email verification with 24-hour token expiration
- Password reset via email with 1-hour token expiration
- Resend verification email functionality
- Rate limiting on email endpoints (prevents abuse)
- Password hashing with bcrypt (12 rounds)
- Session management with NextAuth
- Protected routes and API endpoints
- Unverified users redirected to verification page

### Document Management
- Upload PDFs up to 50MB
- Automatic file validation
- Storage in Supabase Storage
- Organized by user folders

### Advanced Sharing & Inbox

**Link Sharing:**
- Generate secure share links (24-character keys)
- Optional expiration dates
- Password protection with bcrypt encryption
- View count limits (1-10,000 views)
- Email restrictions (limit to specific email)
- Download permissions control
- Copy-to-clipboard functionality
- Revoke links anytime

**Email Sharing:**
- Share directly to email addresses
- Support for registered and unregistered users
- Personal notes (up to 500 characters)
- Optional expiration dates
- Download permissions control
- Email notification ready (stub included)

**Inbox:**
- View all documents shared with you
- Sortable by title, sender, or date
- Responsive design (table/card views)
- Expiration time display
- Personal notes from senders
- One-click access to shared documents

**Share Management:**
- View all active shares per document
- Detailed share information
- Copy share links
- Revoke shares with confirmation
- Status indicators (active/revoked/password-protected)
- Tabbed interface in document details

### Watermarking
- Dynamic watermarks with viewer email
- Timestamp on each view
- Customizable position and opacity
- Applied to all pages

### Analytics
- Track every document view
- Record viewer email, IP, timestamp
- View timeline charts
- Unique viewer counts
- Device and browser information

### DRM Protection
- Disable right-click and text selection
- Block keyboard shortcuts (Ctrl+C, Ctrl+P, etc.)
- DevTools detection with warnings
- Page-by-page rendering (no full PDF download)
- Signed URLs with expiration

### Subscription Plans
- **Free**: 100MB storage, 5 documents
- **Pro**: 10GB storage, unlimited documents, ₹999/month
- **Enterprise**: Unlimited storage, API access, ₹4999/month
- Razorpay integration for payments
- Automatic tier enforcement

## Security Best Practices

- All passwords are hashed with bcrypt
- JWT tokens with secure HTTP-only cookies
- HTTPS enforced in production
- Input validation on all forms
- SQL injection prevention with Prisma
- XSS protection with React
- CSRF protection with NextAuth
- Automated token cleanup for expired verification tokens

## Email Service Setup

### Resend Configuration

The application uses [Resend](https://resend.com) for sending transactional emails (verification and password reset).

**Development Setup:**
1. Create a free Resend account at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. For testing, you can use Resend's test domain: `onboarding@resend.dev`
4. Add to `.env.local`:
   ```
   RESEND_API_KEY="re_your_api_key_here"
   RESEND_FROM_EMAIL="onboarding@resend.dev"
   ```

**Production Setup:**
1. Add your domain in Resend dashboard
2. Configure DNS records:
   - **SPF**: Add TXT record for email authentication
   - **DKIM**: Add TXT record for email signing
   - **DMARC**: Add TXT record for email policy
3. Verify domain in Resend dashboard
4. Update environment variables:
   ```
   RESEND_API_KEY="re_your_production_key"
   RESEND_FROM_EMAIL="noreply@yourdomain.com"
   ```

**Email Templates:**
- Verification emails use branded React Email templates
- Password reset emails include secure one-time links
- All emails include plain text fallbacks
- Templates located in `/emails` directory

**Rate Limiting:**
- Resend verification: 1 request per 60 seconds
- Password reset: 1 request per 60 seconds
- Prevents abuse and spam

## Automated Maintenance

### Token Cleanup Cron Job

The application includes an automated cron job that cleans up expired verification and password reset tokens:

- **Schedule**: Runs daily at 2:00 AM UTC
- **Function**: Deletes tokens expired for more than 7 days
- **Configuration**: Defined in `vercel.json`
- **Security**: Protected by `CRON_SECRET` environment variable

**Setup**:
1. Generate a secure secret: `openssl rand -hex 32`
2. Add `CRON_SECRET` to your Vercel environment variables
3. Deploy - Vercel will automatically configure the cron job

For detailed documentation, see `TOKEN_CLEANUP_CRON.md`

## Support

For issues or questions:
1. Check the `SUPABASE_SETUP_GUIDE.md` for setup help
2. Review the code comments for implementation details
3. Check Supabase and Vercel documentation

## License

This is a production-ready application built for client delivery.

## Credits

Built with ❤️ using Next.js, Supabase, and modern web technologies.
