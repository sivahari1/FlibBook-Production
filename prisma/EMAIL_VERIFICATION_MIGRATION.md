# Email Verification Migration Guide

## Overview

This migration adds email verification functionality to the FlipBook DRM application. It includes:

1. **Database Schema Changes**:
   - Added `emailVerifiedAt` field to the `User` model
   - Created `VerificationToken` model for storing verification and password reset tokens
   - Created `TokenType` enum with `EMAIL_VERIFICATION` and `PASSWORD_RESET` values

2. **Migration Script**: `20251112144003_add_email_verification`

3. **User Verification Script**: `mark-existing-users-verified.ts`

## Database Changes

### User Model Updates
- `emailVerifiedAt`: DateTime? - Timestamp when email was verified (nullable)
- `verificationTokens`: Relation to VerificationToken model

### New VerificationToken Model
- `id`: String (cuid)
- `userId`: String (foreign key to User)
- `token`: String (unique, hashed)
- `type`: TokenType enum
- `expiresAt`: DateTime
- `createdAt`: DateTime

### Indexes
- `token` - For fast token lookups
- `expiresAt` - For efficient cleanup queries
- `userId` - For user-specific token queries

## Migration Steps

### 1. Apply the Migration

The migration has already been applied. If you need to apply it again in a different environment:

```bash
npx prisma migrate deploy
```

### 2. Mark Existing Users as Verified

To prevent existing users from being locked out, run the verification script:

```bash
npm run verify-existing-users
```

Or directly:

```bash
npx tsx prisma/mark-existing-users-verified.ts
```

This script will:
- Mark all existing users with `emailVerified = false` as verified
- Set their `emailVerifiedAt` to the current timestamp
- Display a summary of the operation

### 3. Verify the Changes

Check that all users are verified:

```bash
npx prisma studio
```

Navigate to the `User` model and verify:
- `emailVerified` is `true` for all existing users
- `emailVerifiedAt` is set to a timestamp

## Production Deployment

When deploying to production:

1. **Before Deployment**:
   - Ensure the migration is included in your deployment
   - Add the verification script to your deployment process

2. **During Deployment**:
   - The migration will run automatically via `prisma migrate deploy`
   - Run the verification script immediately after migration

3. **After Deployment**:
   - Verify all existing users are marked as verified
   - Monitor for any users who cannot log in
   - Check application logs for any verification-related errors

## Rollback Plan

If you need to rollback this migration:

```bash
npx prisma migrate resolve --rolled-back 20251112144003_add_email_verification
```

Then manually revert the schema changes and create a new migration.

## Environment Variables

No new environment variables are required for the database schema changes. However, the email verification feature will require:

- `RESEND_API_KEY` - For sending verification emails (to be added in later tasks)
- `NEXT_PUBLIC_APP_URL` - For generating verification links

## Testing

After migration:

1. **Test User Creation**:
   - New users should have `emailVerified = false`
   - `emailVerifiedAt` should be `null`

2. **Test Existing Users**:
   - All existing users should have `emailVerified = true`
   - `emailVerifiedAt` should be set

3. **Test Token Creation**:
   - Tokens can be created with type `EMAIL_VERIFICATION` or `PASSWORD_RESET`
   - Tokens are properly linked to users
   - Indexes are working correctly

## Support

If you encounter issues:

1. Check the migration status: `npx prisma migrate status`
2. View the database: `npx prisma studio`
3. Check application logs for errors
4. Verify environment variables are set correctly

## Next Steps

After completing this migration:

1. Implement token management utilities (Task 2)
2. Set up email service integration (Task 3)
3. Create API routes for verification (Task 4-5)
4. Update authentication flow (Task 6-7)
