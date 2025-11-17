# jstudyroom Platform

A comprehensive document sharing and management platform with DRM protection, member self-registration, curated Book Shop, and personal virtual bookshelf system.

## Access Model

The jstudyroom platform supports two access models:

1. **Member Self-Registration** - Public users can register as Members to access shared documents and the Book Shop
2. **Admin-Managed Access** - Platform Users require admin approval for document upload and sharing capabilities

### User Roles

- **👑 Admin** - Full platform control, manages users, access requests, and Book Shop
- **📤 Platform User** - Can upload, manage, and share protected documents (admin-approved)
- **📚 Member** - Can self-register, access shared documents, browse Book Shop, and maintain personal bookshelf (My jstudyroom)

## Features

### Member Features
- 📚 **Self-Registration** - Public registration with email verification
- 📖 **My jstudyroom** - Personal virtual bookshelf (max 10 documents: 5 free + 5 paid)
- 🛒 **Book Shop** - Browse curated catalog of documents by category
- 💳 **Secure Payments** - Purchase paid documents via Razorpay integration
- 📥 **Files Shared With Me** - Access documents shared by Platform Users
- 🔐 **Email-Based Access Control** - Secure access to shared documents

### Platform User Features
- 📄 **PDF Upload & Management** - Upload and organize PDF documents
- 🔗 **Advanced Sharing** - Link shares and email shares with access controls
- 📥 **Inbox System** - View all documents shared with you
- 💧 **Dynamic Watermarking** - Automatic watermarks with viewer information
- 📊 **View Analytics** - Track who viewed your documents and when
- 🛡️ **DRM Protection** - Prevent unauthorized copying and downloading

### Admin Features
- 🎛️ **Admin Dashboard** - Comprehensive user and access request management
- 📧 **Access Request System** - Approve Platform User access requests
- 🛒 **Book Shop Management** - Create and manage catalog items with categories
- 👥 **Member Management** - View Members, purchase history, and My jstudyroom contents
- 💰 **Payment Tracking** - Monitor all transactions and payment status
- 🔑 **Password Management** - Admin-controlled password generation and reset
- ✉️ **Email Notifications** - Automated emails for all platform events

### Platform Features
- 🌓 **Dark Mode** - Full theme support with light/dark toggle
- 🚀 **Production Ready** - Built for deployment on Vercel with Supabase
- 🔒 **Security First** - Role-based access control, input validation, rate limiting
- 📧 **Email Service** - Resend integration for all transactional emails

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
- Admin email: sivaramj83@gmail.com

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
   - Use support@jstudyroom.dev as the FROM address
   - See detailed setup in the "Email Service Setup" section below

4. **Configure environment variables**:
   - Copy `.env.example` to `.env.local`
   - Update all values with your Supabase credentials
   - Add your Resend API key: `RESEND_API_KEY`
   - Set from email: `RESEND_FROM_EMAIL=support@jstudyroom.dev`
   - Generate a NextAuth secret: `openssl rand -base64 32`
   - Generate a cron secret: `openssl rand -hex 32`
   - **Set admin password**: `ADMIN_SEED_PASSWORD=your_secure_password`
   - Add your Razorpay keys

5. **Set up the database**:
```bash
npx prisma generate
npx prisma db push
```

6. **Create admin account**:
```bash
npx tsx prisma/seed-admin.ts
```

7. **Update existing users** (if migrating):
```bash
npx tsx prisma/update-existing-users.ts
```

8. **Run the development server**:
```bash
npm run dev
```

9. **Access the platform**:
   - Visit `http://localhost:3000` - Landing page with access request form
   - Login as admin at `/login` with sivaramj83@gmail.com
   - Access admin dashboard at `/admin`
   - Review and approve access requests
   - Create user accounts with appropriate roles

## Project Structure

```
jstudyroom-platform/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   │   ├── access-request/    # Public access request endpoint
│   │   ├── admin/             # Admin-only API endpoints
│   │   │   ├── bookshop/      # Book Shop management
│   │   │   ├── members/       # Member management
│   │   │   └── payments/      # Payment tracking
│   │   ├── auth/              # Authentication endpoints
│   │   ├── bookshop/          # Public Book Shop catalog
│   │   ├── member/            # Member-only endpoints
│   │   │   ├── shared/        # Files shared with member
│   │   │   └── my-jstudyroom/ # Personal bookshelf
│   │   ├── payment/           # Razorpay payment endpoints
│   │   └── ...
│   ├── (auth)/            # Authentication pages (login, register)
│   ├── admin/             # Admin dashboard (ADMIN role only)
│   │   ├── bookshop/      # Book Shop management
│   │   ├── members/       # Member management
│   │   └── payments/      # Payment tracking
│   ├── dashboard/         # Platform user dashboard
│   ├── member/            # Member dashboard (MEMBER role only)
│   │   ├── bookshop/      # Book Shop catalog
│   │   ├── my-jstudyroom/ # Personal bookshelf
│   │   └── shared/        # Files shared with me
│   ├── inbox/             # Shared documents inbox
│   ├── view/              # Public document viewer
│   └── page.tsx           # Public landing page
├── components/            # React components
│   ├── admin/            # Admin dashboard components
│   │   ├── BookShopTable.tsx
│   │   ├── BookShopItemForm.tsx
│   │   ├── MembersTable.tsx
│   │   └── MemberDetails.tsx
│   ├── member/           # Member dashboard components
│   │   ├── BookShop.tsx
│   │   ├── BookShopItemCard.tsx
│   │   ├── MyJstudyroom.tsx
│   │   ├── FilesSharedWithMe.tsx
│   │   └── PaymentModal.tsx
│   ├── landing/          # Landing page components
│   ├── auth/             # Authentication components
│   ├── pdf/              # PDF viewer components
│   ├── security/         # DRM protection components
│   ├── theme/            # Theme provider and toggle
│   ├── ui/               # UI components
│   └── layout/           # Layout components
├── lib/                   # Utility functions
│   ├── db.ts             # Database connection
│   ├── auth.ts           # NextAuth with role-based auth
│   ├── role-check.ts     # Role verification utilities
│   ├── audit-log.ts      # Admin action logging
│   ├── my-jstudyroom.ts  # My jstudyroom business logic
│   ├── password-generator.ts  # Secure password generation
│   ├── email.ts          # Email service (Resend)
│   └── storage.ts        # Supabase Storage utilities
├── prisma/               # Database schema
│   ├── schema.prisma     # Prisma schema with all models
│   ├── seed-admin.ts     # Admin account seeding
│   ├── seed-bookshop.ts  # Book Shop sample data
│   └── migrations/       # Database migrations
├── emails/               # Email templates
│   ├── VerificationEmail.tsx
│   ├── PasswordResetEmail.tsx
│   └── ...
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
- `ADMIN_SEED_PASSWORD` - **Required** - Initial password for admin account
- `RAZORPAY_KEY_ID` - Razorpay API key
- `RAZORPAY_KEY_SECRET` - Razorpay secret key
- `NEXT_PUBLIC_RAZORPAY_KEY_ID` - Razorpay public key
- `RESEND_API_KEY` - Resend API key for email service
- `RESEND_FROM_EMAIL` - Email address for sending emails (support@jstudyroom.dev)
- `CRON_SECRET` - Secret for securing cron job endpoints
- `NEXT_PUBLIC_APP_URL` - Your application URL (for email links)

## Features in Detail

### Access Request & Onboarding

**For Members (Self-Registration):**
1. Visit the landing page at `/`
2. Click "Become a Member" or "Register"
3. Fill out registration form with email, password, and name
4. Submit and receive verification email
5. Click verification link in email
6. Login and access Member dashboard at `/member`
7. Browse Book Shop, add documents to My jstudyroom

**For Platform Users (Admin-Approved):**
1. Visit the landing page at `/`
2. Fill out the access request form with:
   - Email address (required)
   - Name (optional)
   - Purpose/use case (required)
   - Estimated documents and users (optional)
   - Select "Platform User" role
3. Submit request and receive confirmation
4. Wait for admin approval

**For Admin:**
1. Receive email notification for new access requests
2. Login to admin dashboard at `/admin`
3. Review access request details
4. Approve and create user account with:
   - Selected role (Platform User or Reader User)
   - Generated secure password
   - Custom price plan
   - Internal notes
5. User receives approval email with login credentials

### Authentication & Role-Based Access
- **No public registration** - All access is admin-approved
- Role-based authentication with NextAuth
- Three user roles: ADMIN, PLATFORM_USER, READER_USER
- Automatic role-based routing after login:
  - Admin → `/admin` (Admin Dashboard)
  - Platform User → `/dashboard` (Full Features)
  - Reader User → `/reader` (View Only)
- Password hashing with bcrypt (12 rounds)
- Session management with role in JWT
- Protected routes and API endpoints with role verification
- Audit logging for all admin actions

### Admin Dashboard
- **Access Request Management:**
  - View all access requests with filtering by status
  - Detailed request information
  - Approve, reject, or close requests
  - Add internal admin notes
- **User Management:**
  - View all users with role filtering
  - Edit user details (role, price plan, notes)
  - Reset user passwords
  - Deactivate/activate users
  - Search by email
- **Email Notifications:**
  - Automatic notifications for new access requests
  - Approval emails with login credentials
  - Password reset notifications

### User Roles & Permissions

| Feature | Admin | Platform User | Member |
|---------|-------|---------------|--------|
| View Admin Dashboard | ✅ | ❌ | ❌ |
| Manage Access Requests | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Manage Book Shop | ✅ | ❌ | ❌ |
| View Payment Tracking | ✅ | ❌ | ❌ |
| Upload Documents | ✅ | ✅ | ❌ |
| Share Documents | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ❌ |
| View Shared Documents | ✅ | ✅ | ✅ |
| Browse Book Shop | ✅ | ✅ | ✅ |
| My jstudyroom | ❌ | ❌ | ✅ |
| Purchase Documents | ❌ | ❌ | ✅ |
| Self-Register | ❌ | ❌ | ✅ |

### Member Self-Registration & Verification
- Public registration form for Members
- Email verification required before login
- Secure password hashing with bcrypt
- Automated verification emails via Resend
- Verification token expiration (24 hours)
- Resend verification option

### Book Shop
**For Members:**
- Browse curated catalog of documents
- Filter by category (Academic, Professional, Fiction, etc.)
- Search by title or description
- View document details and pricing
- Add free documents to My jstudyroom (up to 5)
- Purchase paid documents via Razorpay (up to 5)
- Automatic addition to My jstudyroom after purchase

**For Admin:**
- Create Book Shop items linked to existing documents
- Set title, description, category
- Mark as free or paid with price in ₹
- Publish/unpublish items
- Edit and delete Book Shop items
- Create custom categories
- View all items with filtering

### My jstudyroom (Personal Bookshelf)
- Maximum 10 documents per Member
- 5 free documents limit
- 5 paid documents limit
- View all documents in personal collection
- Access documents in FlipBook viewer
- Return documents to free up space
- Document counters (X/5 free, Y/5 paid, Z/10 total)
- Automatic limit enforcement

### Payment Integration
- Razorpay payment gateway integration
- Secure checkout interface
- Payment verification with signature validation
- Automatic document addition after successful payment
- Purchase confirmation emails
- Payment tracking for admin
- Transaction logging for audit
- Failed payment handling

### Document Management (Platform Users & Admin)
- Upload PDFs up to 50MB
- Automatic file validation
- Storage in Supabase Storage
- Organized by user folders
- Full document management features

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

- **Admin-Managed Access** - No public registration, all users approved by admin
- **Role-Based Access Control** - Three distinct roles with appropriate permissions
- **Password Security** - All passwords hashed with bcrypt (12 rounds)
- **Secure Password Generation** - Cryptographically secure random passwords
- **Role Verification** - Server-side role checks on all protected endpoints
- **Audit Logging** - All admin actions logged for accountability
- **Rate Limiting** - Access request endpoint limited to 5 per hour per IP
- **JWT Tokens** - Secure HTTP-only cookies with role information
- **HTTPS Enforced** - Production requires secure connections
- **Input Validation** - All forms validated and sanitized
- **SQL Injection Prevention** - Prisma ORM with parameterized queries
- **XSS Protection** - React automatic escaping
- **CSRF Protection** - NextAuth built-in protection
- **Automated Token Cleanup** - Expired verification tokens removed daily

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
   RESEND_FROM_EMAIL="support@jstudyroom.dev"
   ```

**Email Templates:**
- Access request notifications to admin
- User approval emails with login credentials
- Password reset emails from admin
- All emails use branded React Email templates
- Plain text fallbacks included
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

## API Documentation

### Member Endpoints
- `POST /api/auth/register` - Member self-registration
- `GET /api/member/shared` - Get documents shared with Member
- `GET /api/member/my-jstudyroom` - Get My jstudyroom contents
- `POST /api/member/my-jstudyroom` - Add document to My jstudyroom
- `DELETE /api/member/my-jstudyroom/[id]` - Return document from My jstudyroom

### Book Shop Endpoints
- `GET /api/bookshop` - Get published Book Shop items (public/member)
- `POST /api/admin/bookshop` - Create Book Shop item (admin only)
- `PATCH /api/admin/bookshop/[id]` - Update Book Shop item (admin only)
- `DELETE /api/admin/bookshop/[id]` - Delete Book Shop item (admin only)
- `GET /api/admin/bookshop/categories` - Get all categories (admin only)

### Payment Endpoints
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment and add to My jstudyroom
- `GET /api/admin/payments` - Get all payments (admin only)

### Admin Endpoints
- `GET /api/admin/members` - Get all Members
- `GET /api/admin/members/[id]` - Get Member details
- `POST /api/admin/members/[id]/toggle-active` - Activate/deactivate Member
- `POST /api/admin/members/[id]/reset-password` - Reset Member password

For complete API documentation, see the design document in `.kiro/specs/jstudyroom-platform/design.md`

## Support

For issues or questions:
1. Check the `SUPABASE_SETUP_GUIDE.md` for setup help
2. Review the code comments for implementation details
3. Check Supabase and Vercel documentation

## License

This is a production-ready application built for client delivery.

## Credits

Built with ❤️ using Next.js, Supabase, and modern web technologies.
