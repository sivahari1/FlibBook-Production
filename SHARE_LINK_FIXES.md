# Share Link and Theme Provider Fixes

## Issues Fixed

### 1. Share Link Validation Error (400 "Invalid input data")

**Problem**: The Zod validation schema was too strict and had complex transform chains that were failing when optional fields were empty strings or undefined.

**Solution**: Simplified the validation schema to handle multiple input types more gracefully:

- **expiresAt**: Now accepts string datetime, empty string, or undefined
- **maxViews**: Now accepts number, numeric string, null, or undefined
- **password**: Now accepts string (min 8 chars), empty string, or undefined
- **restrictToEmail**: Now accepts valid email, empty string, or undefined
- **canDownload**: Defaults to false if not provided

**Changes Made**:
- Updated `lib/validation/sharing.ts` with more flexible union types
- Removed deprecated `.cuid()` validators (replaced with `.min(1)`)
- Improved error messages in API route to show the first validation error

### 2. ThemeProvider Error ("useTheme must be used within a ThemeProvider")

**Problem**: The `useTheme` hook was throwing errors when components tried to use it before the provider fully mounted or during SSR.

**Solution**: Made the ThemeProvider more robust:

- Removed the `if (!mounted)` early return that was preventing context from being available
- Updated `useTheme` hook to return safe defaults instead of throwing errors
- Added console warning instead of throwing when provider is missing (prevents crashes)
- Maintained SSR-safe behavior by checking `typeof window === 'undefined'`

**Changes Made**:
- Updated `components/theme/ThemeProvider.tsx` to always provide context
- Changed error handling to graceful degradation with warnings

## Testing

### Test Share Link Creation

1. Navigate to a document's share dialog
2. Try creating a link with:
   - Empty expiration date ✓
   - Empty max views ✓
   - Empty password ✓
   - Empty email restriction ✓
   - Toggle download permission ✓

3. Try creating a link with all fields filled:
   - Set expiration date (use datetime-local input)
   - Set max views (e.g., 10)
   - Set password (min 8 characters)
   - Set email restriction
   - Toggle download permission

4. Verify error messages are clear when validation fails:
   - Password less than 8 characters
   - Invalid email format
   - Expiration date in the past

### Test Theme Provider

1. Open any page in the application
2. Check browser console - should see no "useTheme" errors
3. Toggle theme using the theme toggle button
4. Refresh page - theme should persist
5. Check that all pages (auth, dashboard, viewer) work without errors

## API Response Format

### Success Response (201)
```json
{
  "shareKey": "abc123...",
  "url": "https://your-domain.com/view/abc123...",
  "expiresAt": "2025-11-20T10:00:00.000Z",
  "maxViews": 10,
  "canDownload": false
}
```

### Error Response (400)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Password must be at least 8 characters",
    "details": [...]
  }
}
```

## Environment Variables Required

Ensure these are set in Vercel:

- `NEXT_PUBLIC_APP_URL`: Your production URL (e.g., https://flib-book-production.vercel.app)
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Secret for NextAuth
- `NEXTAUTH_URL`: Your production URL

## Notes

- The form already sends proper ISO datetime format from `datetime-local` input
- The validation now handles both number and string types for `maxViews`
- Empty strings are properly transformed to `undefined` for optional fields
- The ThemeProvider now works reliably across all pages and during SSR
- Error messages are now user-friendly and specific to the validation issue
