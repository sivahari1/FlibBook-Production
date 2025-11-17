# Admin-Managed Access Control - Design

## Overview

This design transforms the FlipBook DRM application from a self-service registration model to an admin-managed access control system. The system will feature role-based access control (RBAC), a public landing page with access request functionality, and a comprehensive admin dashboard for managing users and access requests.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Public Layer                          │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │ Landing Page │────────▶│  Access Request Form        │  │
│  └──────────────┘         └─────────────────────────────┘  │
│                                      │                       │
│                                      ▼                       │
│                           ┌──────────────────────┐          │
│                           │ Access Request API   │          │
│                           └──────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Authentication Layer                      │
│  ┌──────────────┐         ┌─────────────────────────────┐  │
│  │ Login Page   │────────▶│  NextAuth Credentials       │  │
│  └──────────────┘         └─────────────────────────────┘  │
│                                      │                       │
│                                      ▼                       │
│                           ┌──────────────────────┐          │
│                           │ Role-Based Routing   │          │
│                           └──────────────────────┘          │
└─────────────────────────────────────────────────────────────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                 │
                    ▼                 ▼                 ▼
┌──────────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   Admin Dashboard    │  │ Platform User    │  │  Reader User     │
│                      │  │   Dashboard      │  │   Dashboard      │
│ - Access Requests    │  │                  │  │                  │
│ - User Management    │  │ - Upload Docs    │  │ - View Shared    │
│ - Email Sending      │  │ - Share Docs     │  │   Documents      │
│ - Role Management    │  │ - Analytics      │  │                  │
└──────────────────────┘  └──────────────────┘  └──────────────────┘
```

### Data Flow

#### Access Request Flow
```
Visitor → Landing Page → Request Form → API Validation → Database
                                              │
                                              ▼
                                    Email Notification
                                              │
                                              ▼
                                    Admin Email Inbox
```

#### User Approval Flow
```
Admin Dashboard → View Request → Approve → Create User → Database
                                              │
                                              ▼
                                    Approval Email
                                              │
                                              ▼
                                    User Email Inbox
```

#### Authentication Flow
```
Login Page → Credentials → NextAuth → Database Lookup → Role Check
                                              │
                    ┌─────────────────────────┼─────────────────────┐
                    │                         │                     │
                    ▼                         ▼                     ▼
              Admin Dashboard          Platform Dashboard    Reader Dashboard
```

## Components and Interfaces

### Database Schema

#### User Model (Extended)
```prisma
enum UserRole {
  ADMIN
  PLATFORM_USER
  READER_USER
}

model User {
  id                String    @id @default(cuid())
  email             String    @unique
  name              String?
  passwordHash      String?
  role              UserRole  @default(READER_USER)
  pricePlan         String?   // e.g., "Starter – 10 docs / 5 users – ₹500/month"
  notes             String?   // Internal admin notes
  emailVerified     DateTime?
  isActive          Boolean   @default(true)
  
  // Existing relations
  documents         Document[]
  shareLinks        ShareLink[]
  subscription      Subscription?
  analytics         Analytics[]
  documentShares    DocumentShare[]
  
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  @@index([email])
  @@index([role])
}
```

#### AccessRequest Model (New)
```prisma
model AccessRequest {
  id            String    @id @default(cuid())
  email         String
  name          String?
  purpose       String    // Required: Why they need access
  numDocuments  Int?      // Optional: Estimated number of documents
  numUsers      Int?      // Optional: Estimated number of users
  requestedRole UserRole? // PLATFORM_USER or READER_USER
  extraMessage  String?   // Additional details, budget, notes
  status        String    @default("PENDING") // PENDING, APPROVED, REJECTED, CLOSED
  
  // Admin notes
  adminNotes    String?
  reviewedBy    String?   // Admin email who reviewed
  reviewedAt    DateTime?
  
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  
  @@index([email])
  @@index([status])
  @@index([createdAt])
}
```

### API Endpoints

#### Public Endpoints

**POST /api/access-request**
- Purpose: Submit access request
- Auth: None (public)
- Rate Limit: 5 requests per hour per IP
- Request Body:
```typescript
{
  email: string;
  name?: string;
  purpose: string;
  numDocuments?: number;
  numUsers?: number;
  requestedRole?: 'PLATFORM_USER' | 'READER_USER';
  extraMessage?: string;
}
```
- Response: `{ success: boolean; message: string }`

#### Admin Endpoints

**GET /api/admin/access-requests**
- Purpose: List all access requests
- Auth: ADMIN only
- Query Params: `?status=PENDING&page=1&limit=50`
- Response: `{ requests: AccessRequest[]; pagination: {...} }`

**GET /api/admin/access-requests/[id]**
- Purpose: Get single access request details
- Auth: ADMIN only
- Response: `{ request: AccessRequest }`

**PATCH /api/admin/access-requests/[id]**
- Purpose: Update access request status
- Auth: ADMIN only
- Request Body: `{ status: string; adminNotes?: string }`
- Response: `{ success: boolean; request: AccessRequest }`

**POST /api/admin/users/create**
- Purpose: Create user from access request
- Auth: ADMIN only
- Request Body:
```typescript
{
  accessRequestId: string;
  email: string;
  name?: string;
  role: UserRole;
  password?: string; // If not provided, generate random
  pricePlan?: string;
  notes?: string;
}
```
- Response: `{ success: boolean; user: User; password: string }`

**GET /api/admin/users**
- Purpose: List all users
- Auth: ADMIN only
- Query Params: `?role=PLATFORM_USER&page=1&limit=50`
- Response: `{ users: User[]; pagination: {...} }`

**PATCH /api/admin/users/[id]**
- Purpose: Update user details
- Auth: ADMIN only
- Request Body: `{ role?: UserRole; pricePlan?: string; notes?: string; isActive?: boolean }`
- Response: `{ success: boolean; user: User }`

**POST /api/admin/users/[id]/reset-password**
- Purpose: Reset user password
- Auth: ADMIN only
- Request Body: `{ password?: string }` // If not provided, generate random
- Response: `{ success: boolean; password: string }`

### UI Components

#### Landing Page Components

**LandingHero**
- Purpose: Main hero section with value proposition
- Props: None
- Features:
  - Brand name and tagline
  - Key benefits (3-4 bullet points)
  - CTA button "Request Access"
  - Scroll to request form

**AccessRequestForm**
- Purpose: Form for visitors to request access
- Props: None
- State:
  - Form fields (email, name, purpose, etc.)
  - Validation errors
  - Submission status
- Features:
  - Client-side validation
  - Loading state during submission
  - Success/error messages
  - Rate limit handling

**FeaturesSection**
- Purpose: Showcase platform features
- Props: None
- Features:
  - Feature cards with icons
  - Platform user vs Reader user comparison
  - Security highlights

#### Admin Dashboard Components

**AdminLayout**
- Purpose: Layout wrapper for admin pages
- Props: `{ children: ReactNode }`
- Features:
  - Admin navigation sidebar
  - Header with admin badge
  - Role verification
  - Logout button

**AccessRequestsTable**
- Purpose: Display and manage access requests
- Props: `{ requests: AccessRequest[]; onUpdate: () => void }`
- Features:
  - Sortable columns
  - Status filters
  - Pagination
  - Row actions (view, approve, reject)

**AccessRequestDetail**
- Purpose: Show full details of an access request
- Props: `{ request: AccessRequest; onApprove: () => void; onReject: () => void }`
- Features:
  - All submitted information
  - Admin notes field
  - Action buttons
  - Status history

**UserCreationModal**
- Purpose: Form to create user from access request
- Props: `{ accessRequest: AccessRequest; onSubmit: (data) => void; onCancel: () => void }`
- State:
  - User creation form fields
  - Password generation
  - Validation errors
- Features:
  - Pre-filled from access request
  - Role selector
  - Password generator with copy button
  - Price plan input
  - Admin notes textarea

**UsersTable**
- Purpose: Display and manage all users
- Props: `{ users: User[]; onUpdate: () => void }`
- Features:
  - Sortable columns
  - Role filters
  - Search by email
  - Row actions (edit, reset password, deactivate)

**UserEditModal**
- Purpose: Edit user details
- Props: `{ user: User; onSubmit: (data) => void; onCancel: () => void }`
- Features:
  - Role selector
  - Price plan input
  - Admin notes textarea
  - Active/inactive toggle

#### Reader Dashboard Components

**ReaderDashboard**
- Purpose: Simple dashboard for reader users
- Props: None
- Features:
  - List of documents shared with user
  - Document viewer links
  - No upload/management features

### Email Templates

#### Access Request Notification Email
```typescript
interface AccessRequestNotificationData {
  request: AccessRequest;
  adminDashboardUrl: string;
}
```
- To: support@jstudyroom.dev, sivaramj83@gmail.com
- From: support@jstudyroom.dev
- Subject: "New jstudyroom access request – {email}"
- Content:
  - Request details (email, name, purpose, etc.)
  - Link to admin dashboard
  - Quick approve/reject actions (optional)

#### User Approval Email
```typescript
interface UserApprovalEmailData {
  user: User;
  password: string;
  loginUrl: string;
  pricePlan?: string;
}
```
- To: {user.email}
- From: support@jstudyroom.dev
- Subject: "Your jstudyroom FlipBook DRM access is approved"
- Content:
  - Welcome message
  - Login URL
  - Email and password
  - Role description
  - Pricing details (if applicable)
  - Password change reminder
  - Support contact

#### Password Reset by Admin Email
```typescript
interface PasswordResetByAdminData {
  user: User;
  newPassword: string;
  loginUrl: string;
}
```
- To: {user.email}
- From: support@jstudyroom.dev
- Subject: "Your jstudyroom password has been reset"
- Content:
  - Password reset notification
  - New password
  - Login URL
  - Security reminder
  - Support contact

## Data Models

### AccessRequest State Machine
```
PENDING → APPROVED (when user created)
PENDING → REJECTED (when admin rejects)
PENDING → CLOSED (when admin closes without action)
APPROVED → CLOSED (optional, for cleanup)
REJECTED → CLOSED (optional, for cleanup)
```

### User Role Permissions Matrix

| Feature | ADMIN | PLATFORM_USER | READER_USER |
|---------|-------|---------------|-------------|
| View Admin Dashboard | ✅ | ❌ | ❌ |
| Manage Access Requests | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Upload Documents | ✅ | ✅ | ❌ |
| Share Documents | ✅ | ✅ | ❌ |
| View Analytics | ✅ | ✅ | ❌ |
| View Shared Documents | ✅ | ✅ | ✅ |
| Manage Subscription | ✅ | ✅ | ❌ |

## Error Handling

### Access Request Submission Errors
- **Validation Error**: Return 400 with field-specific errors
- **Rate Limit Exceeded**: Return 429 with retry-after header
- **Email Send Failure**: Log error, return success to user (don't block submission)
- **Database Error**: Return 500 with generic message

### Admin Action Errors
- **Unauthorized**: Return 403 with clear message
- **Not Found**: Return 404 for invalid request/user IDs
- **Duplicate User**: Return 400 when email already exists
- **Email Send Failure**: Show warning but allow action to complete

### Authentication Errors
- **Invalid Credentials**: Return 401 with generic message (don't reveal if email exists)
- **Inactive User**: Return 403 with message to contact admin
- **Missing Role**: Treat as READER_USER (default)

## Testing Strategy

### Unit Tests
- Password hashing and verification
- Email template generation
- Role permission checks
- Form validation logic
- Password generation utility

### Integration Tests
- Access request submission flow
- User creation from access request
- Email sending (mock Resend)
- Authentication with different roles
- Admin API endpoints with role verification

### E2E Tests
- Visitor submits access request
- Admin receives email notification
- Admin approves request and creates user
- User receives approval email
- User logs in with provided credentials
- User lands on correct dashboard based on role
- Reader user cannot access upload features
- Platform user can upload and share documents

## Security Considerations

### Authentication
- Use bcrypt with salt rounds = 12 for password hashing
- Store only hashed passwords, never plain text
- Include role in JWT token for client-side routing
- Verify role on server for all protected endpoints

### Authorization
- Middleware to check ADMIN role for all /admin routes
- API route handlers must verify role before processing
- Client-side role checks for UI rendering only (not security)
- Log all admin actions for audit trail

### Rate Limiting
- Access request endpoint: 5 requests per hour per IP
- Login endpoint: 10 attempts per hour per IP
- Admin endpoints: 100 requests per minute per user

### Data Protection
- Never log plain passwords
- Show generated passwords only once in UI
- Send passwords only via email (secure channel)
- Sanitize all user inputs
- Use parameterized queries (Prisma handles this)

## Migration Strategy

### Phase 1: Database Migration
1. Add UserRole enum to schema
2. Add role, pricePlan, notes to User model
3. Create AccessRequest model
4. Run Prisma migration
5. Set existing users to PLATFORM_USER role
6. Create admin user with ADMIN role

### Phase 2: Authentication Updates
1. Update NextAuth configuration to include role
2. Update session type to include role
3. Add role-based redirect logic
4. Test authentication with different roles

### Phase 3: Admin Dashboard
1. Create admin layout and navigation
2. Implement access requests table and detail views
3. Implement user management table and actions
4. Add email sending functionality
5. Test all admin workflows

### Phase 4: Landing Page
1. Create new landing page design
2. Implement access request form
3. Add form validation and submission
4. Test email notifications

### Phase 5: Role-Based Features
1. Create reader dashboard
2. Hide upload features from reader users
3. Add role checks to all relevant API endpoints
4. Test feature access for each role

### Phase 6: Cleanup
1. Disable/remove public registration page
2. Update navigation to remove registration links
3. Add redirects from old registration URL
4. Update documentation

## Performance Considerations

- Index database columns: email, role, status, createdAt
- Paginate access requests and users lists (50 per page)
- Cache user role in session to avoid repeated DB lookups
- Use server-side rendering for landing page (SEO)
- Lazy load admin dashboard components
- Optimize email template rendering

## Deployment Checklist

- [ ] Set ADMIN_SEED_PASSWORD environment variable
- [ ] Run database migrations
- [ ] Run admin seed script
- [ ] Verify admin login works
- [ ] Test access request submission
- [ ] Verify email notifications are sent
- [ ] Test user creation workflow
- [ ] Verify role-based routing
- [ ] Test all three user roles
- [ ] Disable old registration page
- [ ] Update DNS/domain settings if needed
- [ ] Monitor error logs for first 24 hours
