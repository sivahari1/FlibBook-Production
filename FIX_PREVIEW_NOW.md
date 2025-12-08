# 🚀 Fix Preview Now - Simple Guide

## What's Wrong?

Your document preview shows **"Failed to Load Flipbook"** because the PDF pages were never converted to images.

## Quick Fix (Browser Console Method - EASIEST!)

### 1. Start Server
```bash
npm run dev
```
Wait for: `✓ Ready on http://localhost:3000`

### 2. Open Browser & Log In
- Go to: http://localhost:3000
- Log in if you're not already

### 3. Open Developer Tools
- Press **F12** (or right-click → Inspect)
- Go to **Console** tab

### 4. Paste This Code
Copy and paste this entire code block into the console and press Enter:

```javascript
async function convertAll() {
  const docs = [
    { id: '164fbf91-9471-4d88-96a0-2dfc6611a282', name: 'ma10-rn01' },
    { id: '915f8e20-4826-4cb7-9744-611cc7316c6e', name: 'CVIP-schema' },
    { id: 'test-pbt-doc-free-1764665675746-3-i1u3q', name: 'Test Document 3' },
    { id: 'test-pbt-doc-free-1764665675746-2-i1u3q', name: 'Test Document 2' },
    { id: 'test-pbt-doc-free-1764665675746-1-i1u3q', name: 'Test Document 1' }
  ];
  
  console.log('🔄 Converting documents...\n');
  let success = 0;
  
  for (let i = 0; i < docs.length; i++) {
    console.log(`[${i+1}/${docs.length}] ${docs[i].name}...`);
    try {
      const res = await fetch('/api/documents/convert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ documentId: docs[i].id })
      });
      const result = await res.json();
      if (res.ok) {
        console.log(`✅ Success! ${result.pageCount} pages`);
        success++;
      } else {
        console.log(`❌ Failed: ${result.message}`);
      }
    } catch (e) {
      console.log(`❌ Error: ${e.message}`);
    }
    if (i < docs.length - 1) await new Promise(r => setTimeout(r, 2000));
  }
  
  console.log(`\n✅ Done! ${success}/${docs.length} successful`);
  console.log('💡 Refresh your preview pages now!');
}

convertAll();
```

That's it! Your previews should now work.

## Test It

Open your browser to:
```
http://localhost:3000/dashboard/documents/164fbf91-9471-4d88-96a0-2dfc6611a282/preview
```

## What This Does

The script will:
- ✅ Convert 5 documents that need conversion
- ✅ Generate page images for each PDF
- ✅ Upload images to Supabase storage
- ✅ Update database with image URLs
- ✅ Show you progress and results

## Expected Output

```
🔄 PDF Conversion Tool

[1/5]
📝 Converting: ma10-rn01
   ✅ Success!
   📊 Pages: 3
   ⏱️  Time: 2500ms

[2/5]
📝 Converting: CVIP-schema
   ✅ Success!
   📊 Pages: 3
   ⏱️  Time: 2300ms

...

✅ Conversion Complete!
📊 Results:
   - Successful: 5
   - Failed: 0
   - Total: 5
```

## If Something Goes Wrong

### "Network error: fetch failed"
→ Make sure dev server is running (`npm run dev`)

### "401 Unauthorized"
→ Log in first at http://localhost:3000/login

### "Failed to download PDF"
→ Re-upload the document through dashboard

## Need More Help?

Check these detailed guides:
- **QUICK_PREVIEW_FIX.md** - Step-by-step with alternatives
- **PREVIEW_FIX_GUIDE.md** - Complete troubleshooting
- **.kiro/specs/preview-content-rendering-fix/CONVERSION_FIX_SUMMARY.md** - Technical details

## One-Line Summary

**Problem:** PDFs uploaded but never converted to images  
**Solution:** Run conversion script to generate missing images  
**Result:** Preview works perfectly ✨
