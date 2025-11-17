# Design Document - jstudyroom Platform Extension

## Overview

The jstudyroom platform extends the existing FlipBook DRM application with member-focused features including self-registration, a curated Book Shop, and a personal virtual bookshelf system called "My jstudyroom". The design maintains backward compatibility with existing FlipBook features while adding new capabilities for three distinct user roles.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │ Landing  │  │  Member  │  │ Platform │  │  Admin   │   │
│  │   Page   │  │Dashboard │  │Dashboard │  │Dashboard │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                   Next.js Application                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              API Routes (Serverless)                  │  │
│  │  /api/auth/*  /api/member/*  /api/bookshop/*        │  │
│  │  /api/admin/*  /api/payment/*                        │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Middleware & Auth                        │  │
│  │  Role-based routing, Session management              │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                ┌───────────┴───────────┐
                ▼                       ▼
┌──────────────────────────┐  ┌──────────────────────┐
│   Supabase PostgreSQL    │  │  External Services   │
│   (via Prisma ORM)       │  │  - Resend (Email)    │
│   - Users                │  │  - Razorpay (Payment)│
│   - Documents            │  │  - Supabase Storage  │
│   - BookShopItems        │  └──────────────────────┘
│   - MyJstudyroomItems    │
│   - Payments             │
└──────────────────────────┘
```

### User Role Flow

```
Visitor
  │
  ├─→ Register as Member ─→ Email Verification ─→ Member Dashboard
  │                                                  ├─→ Files Shared With Me
  │                                                  ├─→ My jstudyroom
  │                                                  └─→ Book Shop
  │
  ├─→ Request Platform Access ─→ Admin Approval ─→ Platform User Dashboard
  │                                                  ├─→ Upload Documents
  │                                                  ├─→ Share Documents
  │                                                  └─→ Analytics
  │
  └─→ Admin Login ─→ Admin Dashboard
                      ├─→ Manage Access Requests
                      ├─→ Manage Users
                      ├─→ Manage Book Shop
                      └─→ View Analytics
```

## Components and Interfaces

### Frontend Components

#### Landing Page Components
- `LandingHero` - Hero section with value proposition
- `FeaturesSection` - Feature highlights for Platform Users and Members
- `AccessRequestForm` - Platform User request form (existing)
- `MemberCTA` - Call-to-action for Member registration

#### Member Dashboard Components
- `MemberDashboard` - Main dashboard layout
- `MemberNav` - Navigation between sections
- `FilesSharedWithMe` - List of shared documents
- `MyJstudyroom` - Personal bookshelf view
- `BookShop` - Catalog browser
- `BookShopItem` - Individual book shop item card
- `PaymentModal` - Razorpay payment interface
- `DocumentLimitIndicator` - Visual indicator of document limits

#### Admin Components (New)
- `BookShopManagement` - CRUD interface for Book Shop items
- `BookShopItemForm` - Create/edit Book Shop item
- `MemberManagement` - View and manage Members
- `MemberDetails` - Detailed Member view with My jstudyroom and payments

#### Shared Components
- `ThemeToggle` - Light/dark mode switcher (enhanced)
- `DocumentViewer` - FlipBook PDF viewer (existing)
- `ShareAccessControl` - Share link validation (enhanced)

### API Endpoints

#### Member Endpoints
```
POST   /api/auth/register          - Member self-registration
GET    /api/member/shared          - Get documents shared with Member
GET    /api/member/my-jstudyroom   - Get My jstudyroom contents
POST   /api/member/my-jstudyroom   - Add document to My jstudyroom
DELETE /api/member/my-jstudyroom/[id] - Return document from My jstudyroom
GET    /api/member/bookshop        - Get Book Shop catalog
```

#### Book Shop Endpoints
```
GET    /api/bookshop               - Get published Book Shop items (public/member)
GET    /api/bookshop/[id]          - Get Book Shop item details
POST   /api/admin/bookshop         - Create Book Shop item (admin only)
PATCH  /api/admin/bookshop/[id]    - Update Book Shop item (admin only)
DELETE /api/admin/bookshop/[id]    - Delete Book Shop item (admin only)
GET    /api/admin/bookshop/categories - Get all categories (admin only)
```

#### Payment Endpoints
```
POST   /api/payment/create-order   - Create Razorpay order
POST   /api/payment/verify         - Verify payment and add to My jstudyroom
GET    /api/admin/payments         - Get all payments (admin only)
```

#### Enhanced Share Endpoints
```
GET    /api/share/[shareKey]/access - Validate share access with email check
```

## Data Models

### Updated User Model
```prisma
model User {
  id                  String   @id @default(cuid())
  email               String   @unique
  passwordHash        String
  name                String?
  userRole            UserRole @default(MEMBER)
  
  // New fields for jstudyroom
  freeDocumentCount   Int      @default(0)
  paidDocumentCount   Int      @default(0)
  
  // Existing fields
  pricePlan           String?
  notes               String?
  isActive            Boolean  @default(true)
  emailVerified       Boolean  @default(false)
  emailVerifiedAt     DateTime?
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
  
  // Relations
  documents           Document[]
  shareLinks          ShareLink[]
  emailSharesCreated  DocumentShare[] @relation("SharedByUser")
  emailSharesReceived DocumentShare[] @relation("SharedWithUser")
  myJstudyroomItems   MyJstudyroomItem[]
  payments            Payment[]
  
  @@index([email])
  @@index([userRole])
}

enum UserRole {
  ADMIN
  PLATFORM_USER
  MEMBER
}
```

### BookShopItem Model
```prisma
model BookShopItem {
  id          String   @id @default(cuid())
  documentId  String
  title       String
  description String?
  category    String
  isFree      Boolean  @default(true)
  price       Int?     // Price in paise (₹1 = 100 paise)
  isPublished Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  
  // Relations
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  myJstudyroomItems MyJstudyroomItem[]
  payments    Payment[]
  
  @@index([documentId])
  @@index([category])
  @@index([isPublished])
}
```

### MyJstudyroomItem Model
```prisma
model MyJstudyroomItem {
  id             String   @id @default(cuid())
  userId         String
  bookShopItemId String
  isFree         Boolean
  addedAt        DateTime @default(now())
  
  // Relations
  user           User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookShopItem   BookShopItem @relation(fields: [bookShopItemId], references: [id], onDelete: Cascade)
  
  @@unique([userId, bookShopItemId]) // Prevent duplicates
  @@index([userId])
  @@index([bookShopItemId])
}
```

### Payment Model
```prisma
model Payment {
  id                String   @id @default(cuid())
  userId            String
  bookShopItemId    String
  amount            Int      // Amount in paise
  currency          String   @default("INR")
  status            String   // pending, success, failed
  razorpayOrderId   String?  @unique
  razorpayPaymentId String?  @unique
  razorpaySignature String?
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relations
  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookShopItem      BookShopItem @relation(fields: [bookShopItemId], references: [id])
  
  @@index([userId])
  @@index([bookShopItemId])
  @@index([status])
  @@index([razorpayOrderId])
}
```

### Enhanced ShareLink Model
```prisma
model ShareLink {
  id              String    @id @default(cuid())
  shareKey        String    @unique
  documentId      String
  userId          String
  restrictToEmail String?   // Email restriction for access control
  expiresAt       DateTime?
  isActive        Boolean   @default(true)
  password        String?
  maxViews        Int?
  viewCount       Int       @default(0)
  canDownload     Boolean   @default(false)
  createdAt       DateTime  @default(now())
  
  document        Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([shareKey])
  @@index([restrictToEmail])
}
```

## Business Logic

### My jstudyroom Constraints

```typescript
interface MyJstudyroomLimits {
  MAX_TOTAL_DOCUMENTS: 10
  MAX_FREE_DOCUMENTS: 5
  MAX_PAID_DOCUMENTS: 5
}

async function canAddDocument(
  userId: string,
  isFree: boolean
): Promise<{ allowed: boolean; reason?: string }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { freeDocumentCount: true, paidDocumentCount: true }
  })
  
  const totalCount = user.freeDocumentCount + user.paidDocumentCount
  
  // Check total limit
  if (totalCount >= 10) {
    return {
      allowed: false,
      reason: 'You have reached the maximum of 10 documents in My jstudyroom'
    }
  }
  
  // Check type-specific limit
  if (isFree && user.freeDocumentCount >= 5) {
    return {
      allowed: false,
      reason: 'You have reached the maximum of 5 free documents'
    }
  }
  
  if (!isFree && user.paidDocumentCount >= 5) {
    return {
      allowed: false,
      reason: 'You have reached the maximum of 5 paid documents'
    }
  }
  
  return { allowed: true }
}
```

### Share Access Validation

```typescript
async function validateShareAccess(
  shareKey: string,
  userEmail: string
): Promise<{ allowed: boolean; reason?: string }> {
  const share = await prisma.shareLink.findUnique({
    where: { shareKey },
    include: { document: true }
  })
  
  if (!share) {
    return { allowed: false, reason: 'Share link not found' }
  }
  
  if (!share.isActive) {
    return { allowed: false, reason: 'This share link has been revoked' }
  }
  
  if (share.expiresAt && share.expiresAt < new Date()) {
    return { allowed: false, reason: 'This share link has expired' }
  }
  
  // Email restriction check
  if (share.restrictToEmail) {
    if (share.restrictToEmail !== userEmail) {
      return {
        allowed: false,
        reason: 'This document was shared with a different email address'
      }
    }
  }
  
  return { allowed: true }
}
```

### Payment Flow

```typescript
async function processPayment(
  userId: string,
  bookShopItemId: string,
  razorpayPaymentId: string,
  razorpayOrderId: string,
  razorpaySignature: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Verify payment signature
  const isValid = verifyRazorpaySignature(
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature
  )
  
  if (!isValid) {
    await prisma.payment.update({
      where: { razorpayOrderId },
      data: { status: 'failed' }
    })
    return { success: false, error: 'Payment verification failed' }
  }
  
  // 2. Check document limits
  const canAdd = await canAddDocument(userId, false) // paid document
  if (!canAdd.allowed) {
    return { success: false, error: canAdd.reason }
  }
  
  // 3. Add to My jstudyroom and update payment
  await prisma.$transaction([
    prisma.myJstudyroomItem.create({
      data: {
        userId,
        bookShopItemId,
        isFree: false
      }
    }),
    prisma.user.update({
      where: { id: userId },
      data: { paidDocumentCount: { increment: 1 } }
    }),
    prisma.payment.update({
      where: { razorpayOrderId },
      data: {
        status: 'success',
        razorpayPaymentId,
        razorpaySignature
      }
    })
  ])
  
  // 4. Send confirmation email
  await sendPurchaseConfirmationEmail(userId, bookShopItemId)
  
  return { success: true }
}
```

## Error Handling

### Client-Side Error Handling
- Display user-friendly error messages in toast notifications
- Validate forms before submission
- Handle network errors gracefully with retry options
- Show loading states during async operations

### Server-Side Error Handling
- Return appropriate HTTP status codes (400, 401, 403, 404, 500)
- Log errors with context for debugging
- Sanitize error messages before sending to client
- Use try-catch blocks around database operations
- Implement transaction rollbacks for multi-step operations

### Payment Error Handling
- Handle Razorpay payment failures gracefully
- Provide clear error messages for payment issues
- Log all payment attempts for audit
- Implement retry mechanism for transient failures
- Send failure notifications to admin for manual review

## Testing Strategy

### Unit Tests
- Test business logic functions (canAddDocument, validateShareAccess)
- Test utility functions (password generation, email validation)
- Test data validation schemas
- Test payment verification logic

### Integration Tests
- Test API endpoints with different user roles
- Test database operations and transactions
- Test email sending functionality
- Test payment flow end-to-end

### E2E Tests
- Test Member registration and verification flow
- Test adding documents to My jstudyroom
- Test purchasing paid documents
- Test share access validation
- Test role-based routing

## Security Considerations

### Authentication & Authorization
- Use NextAuth with JWT tokens
- Include userRole in JWT payload
- Verify role on every protected API call
- Implement middleware for route protection
- Use HTTP-only cookies for session management

### Payment Security
- Never store full payment details
- Use Razorpay's secure checkout
- Verify payment signatures server-side
- Log all payment transactions
- Implement fraud detection (unusual patterns)

### Data Protection
- Hash passwords with bcrypt (12 rounds)
- Sanitize all user inputs
- Use parameterized queries (Prisma)
- Implement rate limiting on sensitive endpoints
- Validate file uploads (type, size)

### Share Link Security
- Use cryptographically secure random keys
- Implement expiration for share links
- Validate email restrictions server-side
- Log unauthorized access attempts
- Implement view count limits

## Performance Optimization

### Database Optimization
- Add indexes on frequently queried fields
- Use database connection pooling
- Implement pagination for large lists
- Use select to fetch only needed fields
- Optimize N+1 queries with includes

### Frontend Optimization
- Use Next.js server-side rendering
- Implement code splitting
- Lazy load images and components
- Use React.memo for expensive components
- Implement virtual scrolling for long lists

### Caching Strategy
- Cache Book Shop catalog (revalidate on update)
- Cache user session data
- Use SWR for client-side data fetching
- Implement CDN for static assets
- Cache email templates

## Deployment Considerations

### Environment Variables
```
# Existing
DATABASE_URL
DIRECT_URL
NEXTAUTH_URL
NEXTAUTH_SECRET
RESEND_API_KEY
RESEND_FROM_EMAIL
SUPABASE_*

# New (if needed)
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
NEXT_PUBLIC_RAZORPAY_KEY_ID
```

### Database Migration
1. Run Prisma migration to add new models
2. Update existing User records with default values
3. Seed initial Book Shop categories
4. Test migration on staging environment
5. Create rollback plan

### Deployment Steps
1. Update environment variables in Vercel
2. Run database migrations
3. Deploy application
4. Verify all features work
5. Monitor logs for errors
6. Test payment flow in production

## Monitoring and Analytics

### Application Monitoring
- Track API response times
- Monitor error rates
- Track user registration and verification rates
- Monitor payment success/failure rates
- Track Book Shop item popularity

### Business Metrics
- Member registration rate
- Platform User request rate
- Book Shop conversion rate (views to purchases)
- Average documents per Member
- Revenue from paid documents

### Alerts
- Payment failures
- Email delivery failures
- High error rates
- Unusual user activity
- Database connection issues

