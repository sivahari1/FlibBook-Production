# Visual Fix Guide - Step by Step

## 🎯 Goal
Convert your PDF documents to images so the preview works.

## 📋 Prerequisites
- ✅ Development server running (`npm run dev`)
- ✅ Browser open to http://localhost:3000
- ✅ Logged into your account

---

## Step 1: Open Developer Tools

```
┌─────────────────────────────────────────┐
│  Browser Window                         │
│  ┌───────────────────────────────────┐ │
│  │  http://localhost:3000            │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Press F12 or Right-click → Inspect    │
│                                         │
│  ┌───────────────────────────────────┐ │
│  │  Developer Tools                  │ │
│  │  ┌─────┬─────┬─────┬─────────┐  │ │
│  │  │Elem │Cons │Netw │Sources  │  │ │
│  │  └─────┴─────┴─────┴─────────┘  │ │
│  │         ↑                         │ │
│  │    Click Console Tab              │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Step 2: Paste Conversion Code

```
┌─────────────────────────────────────────┐
│  Console Tab                            │
│  ┌───────────────────────────────────┐ │
│  │ >                                 │ │
│  │                                   │ │
│  │  [Paste the code here]            │ │
│  │                                   │ │
│  │  async function convertAll() {    │ │
│  │    // ... conversion code ...     │ │
│  │  }                                │ │
│  │                                   │ │
│  │  convertAll();                    │ │
│  │                                   │ │
│  │  [Press Enter]                    │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Step 3: Watch Progress

```
┌─────────────────────────────────────────┐
│  Console Output                         │
│  ┌───────────────────────────────────┐ │
│  │ 🔄 Converting documents...        │ │
│  │                                   │ │
│  │ [1/5] ma10-rn01...                │ │
│  │ ✅ Success! 3 pages               │ │
│  │                                   │ │
│  │ [2/5] CVIP-schema...              │ │
│  │ ✅ Success! 3 pages               │ │
│  │                                   │ │
│  │ [3/5] Test Document 3...          │ │
│  │ ✅ Success! 3 pages               │ │
│  │                                   │ │
│  │ [4/5] Test Document 2...          │ │
│  │ ✅ Success! 3 pages               │ │
│  │                                   │ │
│  │ [5/5] Test Document 1...          │ │
│  │ ✅ Success! 3 pages               │ │
│  │                                   │ │
│  │ ✅ Done! 5/5 successful           │ │
│  │ 💡 Refresh your preview pages!    │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## Step 4: Test Preview

```
┌─────────────────────────────────────────┐
│  Navigate to Preview                    │
│  ┌───────────────────────────────────┐ │
│  │  Dashboard → Documents → Preview  │ │
│  └───────────────────────────────────┘ │
│                                         │
│  Before:                                │
│  ┌───────────────────────────────────┐ │
│  │  ⚠️  Failed to Load Flipbook      │ │
│  │                                   │ │
│  │  All pages failed to load.        │ │
│  │  Please check your network...     │ │
│  └───────────────────────────────────┘ │
│                                         │
│  After:                                 │
│  ┌───────────────────────────────────┐ │
│  │  📄 Page 1 of 3                   │ │
│  │  ┌─────────────────────────────┐ │ │
│  │  │                             │ │ │
│  │  │   [PDF Page Content]        │ │ │
│  │  │                             │ │ │
│  │  └─────────────────────────────┘ │ │
│  │  ◀  1  2  3  ▶                   │ │
│  └───────────────────────────────────┘ │
└─────────────────────────────────────────┘
```

---

## 🎉 Success Indicators

### ✅ Conversion Successful
- Console shows "✅ Success!" for each document
- Page count displayed (e.g., "3 pages")
- No error messages

### ✅ Preview Working
- FlipBook loads without errors
- Pages display correctly
- Navigation buttons work
- Page numbers show correctly

---

## ❌ Troubleshooting

### If You See "401 Unauthorized"
```
Problem: Not logged in
Solution: Log in at http://localhost:3000/login
```

### If You See "Document not found"
```
Problem: Document doesn't exist
Solution: Re-upload the document
```

### If You See "Failed to download PDF"
```
Problem: PDF not in Supabase storage
Solution: Re-upload the document
```

### If Preview Still Shows Error
```
Problem: Browser cache
Solution: Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
```

---

## 📝 Quick Reference

### Conversion Code (Copy This)

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

### Preview URLs

```
http://localhost:3000/dashboard/documents/164fbf91-9471-4d88-96a0-2dfc6611a282/preview
http://localhost:3000/dashboard/documents/915f8e20-4826-4cb7-9744-611cc7316c6e/preview
```

---

## 🔗 Related Guides

- **FIX_PREVIEW_NOW.md** - Quick start
- **BROWSER_CONVERSION_FIX.md** - Detailed instructions
- **AUTHENTICATION_FIX_SUMMARY.md** - Why this method works
- **PREVIEW_FIX_GUIDE.md** - Complete troubleshooting
