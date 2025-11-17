# Admin-Managed Access Control Migration

## Overview
This migration adds role-based access control with three user roles (ADMIN, PLATFORM_USER, READER_USER) and creates the AccessRequest model for managing access requests.

## Schema Changes

### 1. New UserRole Enum
```sql
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'PLATFORM_USER', 'READER_USER');
```

### 2. User Model Extensions
```sql
-- Add new columns to users table
ALTER TABLE "users" ADD COLUMN "userRole" "UserRole" NOT NULL DEFAULT 'READER_USER';
ALTER TABLE "users" ADD COLUMN "pricePlan" TEXT;
ALTER TABLE "users" ADD COLUMN "notes" TEXT;
ALTER TABLE "users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- Add index for userRole
CREATE INDEX "users_userRole_idx" ON "users"("userRole");
```

### 3. AccessRequest Model
```sql
-- Create access_requests table
CREATE TABLE "access_requests" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "purpose" TEXT NOT NULL,
    "numDocuments" INTEGER,
    "numUsers" INTEGER,
    "requestedRole" "UserRole",
    "extraMessage" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "adminNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_requests_pkey" PRIMARY KEY ("id")
);

-- Create indexes
CREATE INDEX "access_requests_email_idx" ON "access_requests"("email");
CREATE INDEX "access_requests_status_idx" ON "access_requests"("status");
CREATE INDEX "access_requests_createdAt_idx" ON "access_requests"("createdAt");
```

## Migration Steps

### Step 1: Run Prisma Migration
When database is available, run:
```bash
npx prisma migrate dev --name add_user_roles_and_access_requests
```

### Step 2: Update Existing Users
After migration, run the update script to set existing users to PLATFORM_USER:
```bash
npx tsx prisma/update-existing-users.ts
```

### Step 3: Create Admin User
Run the admin seed script:
```bash
npx tsx prisma/seed-admin.ts
```

## Rollback Plan

If you need to rollback:

```sql
-- Drop access_requests table
DROP TABLE IF EXISTS "access_requests";

-- Remove new columns from users
ALTER TABLE "users" DROP COLUMN IF EXISTS "userRole";
ALTER TABLE "users" DROP COLUMN IF EXISTS "pricePlan";
ALTER TABLE "users" DROP COLUMN IF EXISTS "notes";
ALTER TABLE "users" DROP COLUMN IF EXISTS "isActive";

-- Drop UserRole enum
DROP TYPE IF EXISTS "UserRole";
```

## Verification

After migration, verify:
1. UserRole enum exists with three values
2. users table has new columns
3. access_requests table exists
4. Indexes are created
5. Existing users have userRole set
6. Admin user exists with ADMIN role

## Notes

- Keep the old `role` enum (USER, ADMIN) for backward compatibility
- New `userRole` field uses the new UserRole enum
- Default userRole is READER_USER for new users
- Existing users should be updated to PLATFORM_USER
- Admin user (sivaramj83@gmail.com) should have ADMIN userRole
