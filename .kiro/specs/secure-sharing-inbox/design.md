# Design Document: Secure Sharing & Inbox System

## Overview

This document outlines the technical design for implementing an enhanced secure sharing system with email-specific sharing and a unified inbox. The design extends the existing FlipBook DRM architecture while maintaining security, performance, and user experience standards.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client Layer                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Share Dialog │  │ Inbox Page   │  │ Share Viewer │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                         API Layer                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ /api/share/  │  │ /api/inbox   │  │ /api/share/  │      │
│  │ link         │  │              │  │ [shareKey]   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐  ┌──────────────┐                        │
│  │ /api/share/  │  │ /api/share/  │                        │
│  │ email        │  │ [key]/verify │                        │
│  └──────────────┘  └──────────────┘                        │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Business Logic                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ Share        │  │ Access       │  │ Analytics    │      │
│  │ Management   │  │ Control      │  │ Tracking     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                       Data Layer                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │ ShareLink    │  │ DocumentShare│  │ ViewAnalytics│      │
│  │ (Prisma)     │  │ (Prisma)     │  │ (Prisma)     │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│  ┌──────────────┐                                           │
│  │ Supabase     │                                           │
│  │ Storage      │                                           │
│  └──────────────┘                                           │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Table: DocumentShare

```prisma
model DocumentShare {
  id               String    @id @default(cuid())
  documentId       String
  document         Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  sharedByUserId   String
  sharedBy         User      @relation("SharedByUser", fields: [sharedByUserId], references: [id], onDelete: Cascade)
  
  // Targeted share (email-based)
  sharedWithUserId String?
  sharedWithUser   User?     @relation("SharedWithUser", fields: [sharedWithUserId], references: [id])
  sharedWithEmail  String?
  
  // Optional controls
  expiresAt        DateTime?
  canDownload      Boolean   @default(false)
  note             String?   @db.Text
  
  createdAt        DateTime  @default(now())
  
  @@index([documentId])
  @@index([sharedByUserId])
  @@index([sharedWithUserId])
  @@index([sharedWithEmail])
  @@map("document_shares")
}
```

### Updated Table: ShareLink

```prisma
model ShareLink {
  id              String    @id @default(cuid())
  shareKey        String    @unique
  documentId      String
  document        Document  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  
  userId          String
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  // Access controls
  expiresAt       DateTime?
  isActive        Boolean   @default(true)
  password        String?   // bcrypt hash
  maxViews        Int?
  viewCount       Int       @default(0)
  
  // NEW: Optional email restriction
  restrictToEmail String?
  canDownload     Boolean   @default(false)
  
  createdAt       DateTime  @default(now())
  
  @@index([shareKey])
  @@index([documentId])
  @@index([userId])
  @@index([restrictToEmail])
  @@map("share_links")
}
```

### Updated Relations

```prisma
model User {
  // ... existing fields
  
  // Shares created by this user
  sharesCreated    ShareLink[]       @relation("UserShares")
  emailSharesCreated DocumentShare[] @relation("SharedByUser")
  
  // Shares received by this user
  emailSharesReceived DocumentShare[] @relation("SharedWithUser")
}

model Document {
  // ... existing fields
  
  shareLinks       ShareLink[]
  emailShares      DocumentShare[]
}
```

## Components and Interfaces

### 1. Share Creation Dialog

**Location**: `components/dashboard/ShareDialog.tsx`

**Props**:
```typescript
interface ShareDialogProps {
  documentId: string
  documentTitle: string
  isOpen: boolean
  onClose: () => void
}
```

**Features**:
- Tabbed interface (Link Share / Email Share)
- Form validation with Zod
- Copy-to-clipboard functionality
- Success/error feedback
- Loading states

### 2. Inbox Page

**Location**: `app/inbox/page.tsx`

**Features**:
- Server-side data fetching
- Responsive table/card layout
- Empty state handling
- Sorting and filtering
- Dark mode support

### 3. Share Viewer

**Location**: `app/share/[shareKey]/page.tsx`

**Features**:
- Password prompt modal
- PDF viewer integration
- Download control
- Analytics tracking
- Session requirement

### 4. Password Verification Modal

**Location**: `components/share/PasswordModal.tsx`

**Props**:
```typescript
interface PasswordModalProps {
  shareKey: string
  onSuccess: () => void
  onCancel: () => void
}
```

## API Routes

### POST /api/share/link

**Request Body**:
```typescript
{
  documentId: string
  expiresAt?: string // ISO 8601
  maxViews?: number
  password?: string
  restrictToEmail?: string
  canDownload?: boolean
}
```

**Response**:
```typescript
{
  shareKey: string
  url: string
  expiresAt?: string
  maxViews?: number
  canDownload: boolean
}
```

**Validation Schema**:
```typescript
const createLinkShareSchema = z.object({
  documentId: z.string().cuid(),
  expiresAt: z.string().datetime().optional(),
  maxViews: z.number().int().min(1).max(10000).optional(),
  password: z.string().min(8).max(100).optional(),
  restrictToEmail: z.string().email().optional(),
  canDownload: z.boolean().optional().default(false)
})
```

### POST /api/share/email

**Request Body**:
```typescript
{
  documentId: string
  email: string
  expiresAt?: string
  canDownload?: boolean
  note?: string
}
```

**Response**:
```typescript
{
  success: true
  shareId: string
}
```

**Validation Schema**:
```typescript
const createEmailShareSchema = z.object({
  documentId: z.string().cuid(),
  email: z.string().email(),
  expiresAt: z.string().datetime().optional(),
  canDownload: z.boolean().optional().default(false),
  note: z.string().max(500).optional()
})
```

### GET /api/inbox

**Response**:
```typescript
{
  shares: Array<{
    id: string
    document: {
      id: string
      title: string
      filename: string
    }
    sharedBy: {
      name: string
      email: string
    }
    createdAt: string
    expiresAt?: string
    canDownload: boolean
    note?: string
  }>
}
```

### GET /api/share/[shareKey]

**Query Parameters**:
- `password` (optional): For password-protected shares

**Response**:
```typescript
{
  document: {
    id: string
    title: string
    filename: string
  }
  signedUrl: string
  canDownload: boolean
  requiresPassword: boolean
} | {
  error: {
    code: string
    message: string
    requiresPassword?: boolean
  }
}
```

### POST /api/share/[shareKey]/verify-password

**Request Body**:
```typescript
{
  password: string
}
```

**Response**:
```typescript
{
  success: true
} | {
  error: {
    code: string
    message: string
  }
}
```

**Side Effect**: Sets cookie `share_ok_{shareKey}` with HttpOnly, SameSite=Lax, Max-Age=3600

### POST /api/share/[shareKey]/track

**Request Body**:
```typescript
{
  duration?: number // seconds
}
```

**Response**:
```typescript
{
  success: true
  analyticsId: string
}
```

## Data Models

### TypeScript Interfaces

```typescript
// lib/types/sharing.ts

export interface LinkShareCreate {
  documentId: string
  expiresAt?: Date
  maxViews?: number
  password?: string
  restrictToEmail?: string
  canDownload?: boolean
}

export interface EmailShareCreate {
  documentId: string
  email: string
  expiresAt?: Date
  canDownload?: boolean
  note?: string
}

export interface ShareAccess {
  isValid: boolean
  requiresPassword: boolean
  document?: {
    id: string
    title: string
    storagePath: string
  }
  canDownload: boolean
  error?: {
    code: string
    message: string
  }
}

export interface InboxItem {
  id: string
  document: {
    id: string
    title: string
    filename: string
  }
  sharedBy: {
    name: string
    email: string
  }
  createdAt: Date
  expiresAt?: Date
  canDownload: boolean
  note?: string
  type: 'link' | 'email'
}
```

## Security Design

### Authentication Flow

```
1. User attempts to access /share/[shareKey]
2. Middleware checks for valid session
3. If no session → redirect to /login?callbackUrl=/share/[shareKey]
4. If session exists → proceed to share validation
```

### Authorization Checks

**For Link Shares**:
1. Verify share exists and isActive = true
2. Check expiration: `expiresAt > now()`
3. Check view limit: `viewCount < maxViews`
4. If restrictToEmail set: verify `session.user.email === restrictToEmail`
5. If password set: verify cookie `share_ok_{shareKey}` exists OR prompt for password

**For Email Shares**:
1. Verify share exists
2. Check expiration: `expiresAt > now()`
3. Verify recipient: `sharedWithUserId === session.user.id` OR `sharedWithEmail === session.user.email`

### Password Handling

```typescript
// Creating share with password
const hashedPassword = await bcrypt.hash(password, 12)
await prisma.shareLink.create({
  data: {
    // ... other fields
    password: hashedPassword
  }
})

// Verifying password
const isValid = await bcrypt.compare(providedPassword, share.password)
if (isValid) {
  // Set cookie
  cookies().set(`share_ok_${shareKey}`, 'true', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 3600,
    secure: process.env.NODE_ENV === 'production'
  })
}
```

### Signed URL Generation

```typescript
// Generate short-lived signed URL
const { url, error } = await getSignedUrl(
  document.storagePath,
  300 // 5 minutes TTL
)
```

## Error Handling

### Error Response Format

```typescript
interface ErrorResponse {
  error: {
    code: string
    message: string
    details?: Record<string, any>
  }
}
```

### Error Codes

- `UNAUTHORIZED`: Authentication required
- `FORBIDDEN`: Access denied
- `NOT_FOUND`: Resource not found
- `EXPIRED`: Share has expired
- `INACTIVE`: Share has been revoked
- `VIEW_LIMIT_EXCEEDED`: Maximum views reached
- `EMAIL_MISMATCH`: Email restriction not satisfied
- `INVALID_PASSWORD`: Password verification failed
- `VALIDATION_ERROR`: Input validation failed
- `INTERNAL_ERROR`: Server error

## Testing Strategy

### Unit Tests

**Test Files**:
- `lib/__tests__/sharing.test.ts`
- `lib/__tests__/access-control.test.ts`

**Test Cases**:
1. Share key generation is unique and secure
2. Password hashing uses bcrypt with correct rounds
3. Email lookup finds existing users correctly
4. Access validation enforces all rules
5. View count increments atomically
6. Expiration checks work correctly

### Integration Tests

**Test Files**:
- `app/api/share/__tests__/link.test.ts`
- `app/api/share/__tests__/email.test.ts`
- `app/api/__tests__/inbox.test.ts`

**Test Cases**:
1. Creating link share returns valid URL
2. Creating email share notifies recipient
3. Inbox returns correct shares for user
4. Password verification sets cookie
5. Analytics tracking records data

### E2E Tests

**Test Files**:
- `e2e/sharing.spec.ts`

**Test Scenarios**:
1. Owner creates link → recipient opens → sees PDF
2. Owner shares to email → recipient sees in inbox
3. Expired share returns 403
4. Password-protected share prompts for password
5. Email-restricted share enforces email match

## Performance Considerations

### Database Indexes

```sql
-- ShareLink indexes
CREATE INDEX idx_sharelink_sharekey ON share_links(share_key);
CREATE INDEX idx_sharelink_documentid ON share_links(document_id);
CREATE INDEX idx_sharelink_userid ON share_links(user_id);
CREATE INDEX idx_sharelink_restrictemail ON share_links(restrict_to_email);

-- DocumentShare indexes
CREATE INDEX idx_docshare_documentid ON document_shares(document_id);
CREATE INDEX idx_docshare_sharedby ON document_shares(shared_by_user_id);
CREATE INDEX idx_docshare_sharedwith ON document_shares(shared_with_user_id);
CREATE INDEX idx_docshare_email ON document_shares(shared_with_email);
```

### Caching Strategy

- Cache signed URLs for 4 minutes (80% of TTL)
- Cache inbox results for 30 seconds
- Use SWR for client-side data fetching

### Rate Limiting

```typescript
// Rate limit share creation: 30 per minute per user
const rateLimiter = new RateLimiter({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => req.session.user.id
})
```

## Deployment Considerations

### Environment Variables

Required in Vercel:
```
AUTH_URL=https://your-domain.vercel.app
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=<your-secret>
DATABASE_URL=<pooler-url>
DIRECT_URL=<direct-url>
NEXT_PUBLIC_SUPABASE_URL=<supabase-url>
SUPABASE_SERVICE_ROLE_KEY=<service-key>
```

### Migration Strategy

1. Run migration in development: `npx prisma migrate dev --name sharing-and-inbox`
2. Test thoroughly in development
3. Deploy to preview environment
4. Run migration in production: `npx prisma migrate deploy`
5. Monitor for errors
6. Rollback plan: Keep old ShareLink working during transition

### Monitoring

- Track share creation rate
- Monitor failed access attempts
- Alert on high error rates
- Track signed URL generation time
- Monitor database query performance

## Future Enhancements

1. **Email Notifications**: Integrate Resend for email invites
2. **Share Analytics Dashboard**: Visualize share usage
3. **Bulk Sharing**: Share to multiple emails at once
4. **Share Templates**: Save common share configurations
5. **Share Expiry Reminders**: Notify before shares expire
6. **Advanced Permissions**: View-only, comment, edit modes
7. **Share Groups**: Create groups for easier sharing
8. **Audit Log**: Track all share operations
