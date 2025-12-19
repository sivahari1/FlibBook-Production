# Vercel Build Error Fix

## Issue
Vercel build was failing with ESLint error:
```
Attempted import error: 'db' is not exported from '@/lib/db' (imported as 'db').
```

## Root Cause
The `lib/db.ts` file was exporting `prisma` but some files were trying to import `db`.

## Solution Applied

### 1. Added `db` Export to lib/db.ts
Added a named export alias for backward compatibility:
```typescript
// Named export alias for backward compatibility
export const db = prisma
```

### 2. Updated Import Statements
Fixed import statements in the following files:
- `app/api/support/problem-report/route.ts` - Changed `db` to `prisma`
- `app/api/documents/[id]/convert/route.ts` - Changed `db` to `prisma`

### 3. Updated Usage
Updated the usage in `app/api/support/problem-report/route.ts`:
- Changed `db.problemReport.create` to `prisma.problemReport.create`

## Remaining Issues

### ESLint Warnings (Non-blocking)
There are numerous ESLint warnings in test files, primarily:
- `@typescript-eslint/no-explicit-any` - Use of `any` type
- `@typescript-eslint/no-unused-vars` - Unused variables
- `react-hooks/rules-of-hooks` - React Hooks called in non-component functions (test files)

These are warnings and should not block the build. However, if the build is configured to treat warnings as errors, you may need to:

1. **Option 1: Disable ESLint errors in build** (Quick fix)
   Add to `next.config.ts`:
   ```typescript
   eslint: {
     ignoreDuringBuilds: true,
   }
   ```

2. **Option 2: Fix the warnings** (Proper fix)
   - Replace `any` types with proper types
   - Remove unused variables
   - Fix React Hook usage in test files

## Verification Steps

1. Try building locally:
   ```bash
   npm run build
   ```

2. If successful, push to trigger Vercel deployment

3. If still failing, check Vercel build logs for specific errors

## Notes
- The main `db` import error has been fixed
- Test files have React Hook violations but these don't affect production
- Consider adding ESLint ignore for test files if needed
