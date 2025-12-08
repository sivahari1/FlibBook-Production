# Browser-Based Conversion Fix

## Problem
The conversion script failed with **401 Unauthorized** because it needs authentication.

## Solution: Use Browser Console (Easiest!)

Since you're already logged into your application, use the browser console to trigger conversion.

### Step-by-Step Instructions

1. **Make sure dev server is running:**
   ```bash
   npm run dev
   ```

2. **Open your browser** to: http://localhost:3000

3. **Log in** if you're not already logged in

4. **Open Developer Tools** (Press F12)

5. **Go to Console tab**

6. **Paste this code** and press Enter:

```javascript
// Conversion function
async function convertDocument(documentId, documentName) {
  console.log(`\n📝 Converting: ${documentName}`);
  console.log(`   Document ID: ${documentId}`);
  
  try {
    const response = await fetch('/api/documents/convert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documentId })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log(`   ✅ Success!`);
      console.log(`   📊 Pages: ${result.pageCount}`);
      console.log(`   ⏱️  Time: ${result.processingTime}ms`);
      return { success: true, result };
    } else {
      const error = await response.json();
      console.log(`   ❌ Failed: ${response.status}`);
      console.log(`   Error:`, error);
      return { success: false, error };
    }
  } catch (error) {
    console.log(`   ❌ Error:`, error.message);
    return { success: false, error: error.message };
  }
}

// Documents to convert
const documents = [
  { id: '164fbf91-9471-4d88-96a0-2dfc6611a282', name: 'ma10-rn01' },
  { id: '915f8e20-4826-4cb7-9744-611cc7316c6e', name: 'CVIP-schema' },
  { id: 'test-pbt-doc-free-1764665675746-3-i1u3q', name: 'Test Document 3' },
  { id: 'test-pbt-doc-free-1764665675746-2-i1u3q', name: 'Test Document 2' },
  { id: 'test-pbt-doc-free-1764665675746-1-i1u3q', name: 'Test Document 1' }
];

// Convert all documents
async function convertAll() {
  console.log('🔄 Starting conversion for all documents...\n');
  
  let successCount = 0;
  let failureCount = 0;
  
  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    console.log(`[${i + 1}/${documents.length}]`);
    
    const result = await convertDocument(doc.id, doc.name);
    
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
    
    // Wait 2 seconds between conversions
    if (i < documents.length - 1) {
      console.log('   ⏳ Waiting 2 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Conversion Complete!');
  console.log(`📊 Results: ${successCount} successful, ${failureCount} failed`);
  console.log('\n💡 Now refresh your preview pages to see the results!');
}

// Run the conversion
convertAll();
```

7. **Wait for completion** (will take about 10-20 seconds)

8. **Check the results** in the console

9. **Test the preview** by going to:
   ```
   http://localhost:3000/dashboard/documents/164fbf91-9471-4d88-96a0-2dfc6611a282/preview
   ```

## Alternative: Convert One Document at a Time

If you want to convert just one document, use this simpler code:

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
  alert(`Success! Converted ${result.pageCount} pages`);
})
.catch(error => {
  console.error('❌ Error:', error);
  alert('Conversion failed! Check console for details.');
});
```

## Expected Output

You should see something like:

```
🔄 Starting conversion for all documents...

[1/5]
📝 Converting: ma10-rn01
   Document ID: 164fbf91-9471-4d88-96a0-2dfc6611a282
   ✅ Success!
   📊 Pages: 3
   ⏱️  Time: 2500ms
   ⏳ Waiting 2 seconds...

[2/5]
📝 Converting: CVIP-schema
   Document ID: 915f8e20-4826-4cb7-9744-611cc7316c6e
   ✅ Success!
   📊 Pages: 3
   ⏱️  Time: 2300ms
   ⏳ Waiting 2 seconds...

...

============================================================
✅ Conversion Complete!
📊 Results: 5 successful, 0 failed

💡 Now refresh your preview pages to see the results!
```

## After Conversion

1. Go to your dashboard: http://localhost:3000/dashboard
2. Click on any document
3. The preview should now work!

## If You Still Get Errors

### "Document not found"
- The document doesn't exist in the database
- Try re-uploading the document

### "Failed to download PDF"
- The PDF file doesn't exist in Supabase storage
- Re-upload the document through the dashboard

### "Only PDF documents can be converted"
- The document is not a PDF
- Check the document type

## Why This Works

The browser console method works because:
- ✅ You're already logged in
- ✅ Your session cookie is automatically included
- ✅ The API recognizes you as authenticated
- ✅ No need for manual authentication tokens

## Next Steps

After successful conversion:
1. ✅ Test all preview URLs
2. ✅ Verify images in Supabase storage
3. ✅ Check database for image URLs
4. ✅ Deploy to production if needed
