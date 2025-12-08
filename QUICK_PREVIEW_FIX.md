# Quick Preview Fix - 2 Simple Steps

## The Problem

Your documents were uploaded but the PDF-to-image conversion never ran, so the preview shows "Failed to Load Flipbook".

## The Solution (2 Steps)

### Step 1: Start Development Server

Open a terminal and run:
```bash
npm run dev
```

Wait until you see: `✓ Ready on http://localhost:3000`

### Step 2: Run Conversion Script

Open a **NEW terminal window** (keep the first one running) and run:
```bash
npx tsx scripts/convert-documents-simple.ts
```

This will:
- Convert all 5 documents that need conversion
- Show progress for each document
- Display success/failure for each one
- Give you direct preview URLs to test

## Expected Output

You should see something like:
```
🔄 PDF Conversion Tool

[1/5]
📝 Converting: ma10-rn01
   Document ID: 164fbf91-9471-4d88-96a0-2dfc6611a282
   ✅ Success!
   📊 Pages: 3
   ⏱️  Time: 2500ms
   💾 Cached: No
   ⏳ Waiting 2 seconds...

[2/5]
📝 Converting: CVIP-schema
...
```

## After Conversion

1. Open your browser to: http://localhost:3000/dashboard
2. Click on any document
3. The preview should now work!

## If It Doesn't Work

### Error: "Network error: fetch failed"

**Problem:** Development server isn't running

**Solution:** Make sure you ran `npm run dev` in Step 1

### Error: "401 Unauthorized"

**Problem:** Not logged in

**Solution:** 
1. Go to http://localhost:3000/login
2. Log in with your credentials
3. Run the conversion script again

### Error: "Failed to download PDF"

**Problem:** PDF file doesn't exist in Supabase storage

**Solution:** Re-upload the document through the dashboard

### Error: "Database connection failed"

**Problem:** Database credentials incorrect

**Solution:** Check your `.env.local` file has correct Supabase credentials

## Alternative: Browser Console Method

If the script doesn't work, you can convert documents manually:

1. Start dev server: `npm run dev`
2. Open browser to: http://localhost:3000
3. Open Developer Tools (F12)
4. Go to Console tab
5. Paste this code:

```javascript
// Convert first document
fetch('/api/documents/convert', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    documentId: '164fbf91-9471-4d88-96a0-2dfc6611a282' 
  })
})
.then(r => r.json())
.then(result => console.log('✅ Result:', result))
.catch(error => console.error('❌ Error:', error));
```

6. Wait for conversion to complete
7. Refresh the preview page

## Still Having Issues?

Check these files for more detailed troubleshooting:
- `PREVIEW_FIX_GUIDE.md` - Comprehensive guide with all options
- `PREVIEW_ERROR_FIX_GUIDE.md` - Error-specific solutions

## Need to Convert More Documents Later?

Just run the conversion script again:
```bash
npx tsx scripts/convert-documents-simple.ts
```

Or use the browser console method with the specific document ID.
