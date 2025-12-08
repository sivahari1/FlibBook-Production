# Quick Preview Test Guide

## 🚀 Immediate Action: Test Preview Now

You have **2 documents ready** for preview testing!

### Step 1: Start Dev Server
```bash
npm run dev
```

### Step 2: Test Preview

Open your browser and navigate to one of these URLs:

**Document 1: ma10-rn01 (6 pages)**
```
http://localhost:3000/dashboard/documents/164fbf91-9471-4d88-96a0-2dfc6611a282/view
```

**Document 2: CVIP-schema (7 pages)**
```
http://localhost:3000/dashboard/documents/915f8e20-4826-4cb7-9744-611cc7316c6e/view
```

### Step 3: What to Look For

✅ **Success looks like:**
- Flipbook viewer loads
- Page images display clearly
- You can navigate between pages
- Zoom controls work
- No error messages

❌ **If you see issues:**
- Open browser DevTools (F12)
- Check Console tab for errors
- Check Network tab for failed requests
- Take a screenshot and share it

## 🔄 Convert More Documents (Optional)

If you want to convert the remaining 8 test documents:

1. **Keep dev server running** (from Step 1)

2. **Open a new terminal** and run:
   ```bash
   npx tsx scripts/convert-documents-simple.ts
   ```

3. **Wait for conversion** to complete

4. **Refresh the dashboard** to see all documents

## 🐛 Quick Troubleshooting

### Preview shows blank/white screen?
- Check browser console for errors
- Verify you're logged in
- Try hard refresh: Ctrl+Shift+R

### "No pages found" error?
- Document needs conversion
- Run conversion script (see above)

### 401 Unauthorized errors?
- Make sure dev server is running
- Check you're logged in
- Verify session hasn't expired

### Images not loading?
- Check Network tab in DevTools
- Verify Supabase storage URLs are accessible
- Check CORS settings

## 📊 Verify Everything Works

Run these diagnostic commands:

```bash
# List all documents and their status
npx tsx scripts/list-documents.ts

# Verify page data exists
npx tsx scripts/verify-document-pages-data.ts

# Test page URL accessibility
npx tsx scripts/test-page-urls-direct.ts
```

## 💡 Pro Tips

1. **Use the working documents first** - Test with ma10-rn01 or CVIP-schema before converting others
2. **Check one thing at a time** - If preview fails, isolate the issue (API? Images? Frontend?)
3. **Browser cache matters** - Always try a hard refresh if things look weird
4. **DevTools are your friend** - Console and Network tabs show exactly what's happening

---

**Ready to test?** Start with Step 1 above! 🎉
