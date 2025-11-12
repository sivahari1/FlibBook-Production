# FlipBook DRM - Production Ready Application

A secure PDF sharing platform with DRM protection, watermarking, analytics, and subscription management.

## Features

- 🔐 **Secure Authentication** - User registration and login with NextAuth
- 📄 **PDF Upload & Management** - Upload and organize PDF documents
- 🔗 **Secure Sharing** - Generate time-limited share links
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

3. **Configure environment variables**:
   - Copy `.env.example` to `.env.local`
   - Update all values with your Supabase credentials
   - Generate a NextAuth secret: `openssl rand -base64 32`
   - Add your Razorpay keys

4. **Set up the database**:
```bash
npx prisma generate
npx prisma db push
```

5. **Run the development server**:
```bash
npm run dev
```

6. **Open your browser**:
   - Visit `http://localhost:3000`
   - Register a new account
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

## Features in Detail

### Authentication
- Secure registration with email and password
- Password hashing with bcrypt (12 rounds)
- Session management with NextAuth
- Protected routes and API endpoints

### Document Management
- Upload PDFs up to 50MB
- Automatic file validation
- Storage in Supabase Storage
- Organized by user folders

### Secure Sharing
- Generate unique share links
- Optional expiration dates
- Password protection (optional)
- View count limits (optional)
- Revoke links anytime

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

## Support

For issues or questions:
1. Check the `SUPABASE_SETUP_GUIDE.md` for setup help
2. Review the code comments for implementation details
3. Check Supabase and Vercel documentation

## License

This is a production-ready application built for client delivery.

## Credits

Built with ❤️ using Next.js, Supabase, and modern web technologies.
