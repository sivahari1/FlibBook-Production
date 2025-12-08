# Preview Fix Guide - Missing Page Images

## Problem Identified ✅

The preview is failing with "Failed to Load Flipbook" because:
- Documents exist in database ✅
- Document pages exist in database ✅  
- **BUT page `imageUrl` fields are `undefined`** ❌
- **No page images exist in Supabase storage** ❌

## Root Cause

When documents were uploaded, the **PDF conversion process didn't run properly**, so no page images were generated in Supabase storage.

## Solution: Trigger PDF Conversion

You need to trigger the PDF conversion for your uploaded documents. Here are the steps:

### Option 1: Using the Development Server (Recommended)

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Wait for the server to start** (you should see "Ready on http://localhost:3000")

3. **In a NEW terminal window**, trigger conversion for a specific document:
   ```bash
   curl -X POST http://localhost:3000/api/documents/convert ^
     -H "Content-Type: application/json" ^
     -d "{\"documentId\": \"164fbf91-9471-4d88-96a0-2dfc6611a282\"}"
   ```

4. **Check if it worked:**
   - Refresh your browser at the preview URL
   - Check the terminal for conversion progress
   - Look for "Successfully converted X pages" message

### Option 2: Using Browser Console

1. **Start dev server:** `npm run dev`

2. **Open your browser** to http://localhost:3000

3. **Open Developer Tools** (F12)

4. **Go to Console tab**

5. **Paste and run this code:**
   ```javascript
   fetch('/api/documents/convert', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ 
       documentId: '164fbf91-9471-4d88-96a0-2dfc6611a282' 
     })
   })
   .then(r => r.json())
   .then(result => {
     console.log('✅ Conversion result:', result);
     alert('Conversion complete! Check console for details.');
   })
   .catch(error => {
     console.error('❌ Conversion failed:', error);
     alert('Conversion failed! Check console for details.');
   });
   ```

6. **Wait for the conversion** (may take 10-30 seconds depending on PDF size)

7. **Refresh the preview page** to see if it works

### Option 3: Re-upload the Document

If conversion fails, you can simply re-upload the document:

1. Go to your dashboard
2. Delete the problematic document
3. Upload it again
4. The conversion should run automatically during upload

## Document IDs to Convert

Here are the document IDs that need conversion:

```
164fbf91-9471-4d88-96a0-2dfc6611a282  (ma10-rn01)
915f8e20-4826-4cb7-9744-611cc7316c6e  (CVIP-schema)
test-pbt-doc-free-1764665675746-3-i1u3q  (Test Document 3)
test-pbt-doc-free-1764665675746-2-i1u3q  (Test Document 2)
test-pbt-doc-free-1764665675746-1-i1u3q  (Test Document 1)
```

## Preview URLs to Test

After conversion, test these URLs:

```
http://localhost:3000/dashboard/documents/164fbf91-9471-4d88-96a0-2dfc6611a282/preview
http://localhost:3000/dashboard/documents/915f8e20-4826-4cb7-9744-611cc7316c6e/preview
```

## Expected Results After Fix

- ✅ Page images generated in Supabase `document-pages` bucket
- ✅ Database `DocumentPage` records updated with image URLs
- ✅ Preview pages load correctly
- ✅ FlipBook component displays pages
- ✅ No more "Failed to Load Flipbook" error

## Troubleshooting

### If Conversion API Returns 404

The conversion API endpoint might not exist. Check if the file exists:
```
app/api/documents/convert/route.ts
```

### If Conversion Times Out

- Check if the PDF file exists in Supabase `documents` bucket
- Verify Supabase storage permissions
- Check server logs for errors

### If Images Don't Load After Conversion

1. Check Supabase storage bucket `document-pages`
2. Verify images were uploaded
3. Check if image URLs are public
4. Verify CORS settings in Supabase

### If Database Connection Fails

Make sure your `.env.local` file has correct values:
```
DATABASE_URL="postgresql://..."
NEXT_PUBLIC_SUPABASE_URL="https://..."
SUPABASE_SERVICE_ROLE_KEY="..."
```

## Next Steps

1. ✅ Start development server
2. ✅ Trigger conversion for one document
3. ✅ Verify it works in browser
4. ✅ Convert remaining documents
5. ✅ Test all preview URLs
6. ✅ Deploy to production if needed

## Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check the server terminal for logs
3. Verify Supabase storage bucket exists
4. Check environment variables are set correctly
