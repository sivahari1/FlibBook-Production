# NextAuth CLIENT_FETCH_ERROR Fix

## Problem
Getting error: `[next-auth][error][CLIENT_FETCH_ERROR] "Unexpected token '<', \"<!DOCTYPE \"... is not valid JSON"`

This means NextAuth is trying to fetch JSON from `/api/auth/session` but getting an HTML page instead.

## Root Cause
With Next.js 16 + Turbopack, there can be caching issues where the API routes aren't properly registered or environment variables aren't loaded.

## Solution

### Step 1: Clear Next.js Cache
```bash
# Stop your dev server (Ctrl+C)

# Delete the .next directory
rmdir /s /q .next

# Also delete node_modules/.cache if it exists
rmdir /s /q node_modules\.cache
```

### Step 2: Verify Environment Variables
Make sure your `.env` file has:
```env
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="Qx13aG3EUedHk21Y4iX60Zqs0So3KmfqULb1MafTYIc="
DATABASE_URL="postgresql://..."
```

✅ Your `.env` file looks good!

### Step 3: Restart Dev Server
```bash
npm run dev
```

### Step 4: Test in Browser
1. Open http://localhost:3000
2. Try to log in
3. Check browser console for errors

## Alternative: Use Standard Next.js (without Turbopack)
If the issue persists, try running without Turbopack:

```bash
# In package.json, change:
"dev": "next dev"

# Instead of:
"dev": "next dev --turbo"
```

Then restart:
```bash
npm run dev
```

## Still Not Working?

### Check if API route is accessible
Open http://localhost:3000/api/auth/providers in your browser.

You should see JSON like:
```json
{
  "credentials": {
    "id": "credentials",
    "name": "Credentials",
    "type": "credentials"
  }
}
```

If you see an HTML error page instead, the API route isn't loading properly.

### Check for Port Conflicts
Make sure port 3000 isn't already in use:
```bash
netstat -ano | findstr :3000
```

If something is using it, either kill that process or change the port:
```bash
npm run dev -- -p 3001
```

Then update `.env`:
```env
NEXTAUTH_URL="http://localhost:3001"
NEXT_PUBLIC_APP_URL="http://localhost:3001"
```

## What Fixed It
Once you get it working, let me know which step fixed it so we can document it!
