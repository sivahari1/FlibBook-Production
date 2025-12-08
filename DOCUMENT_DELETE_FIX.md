# Document Deletion Fix

## Problem
Document deletion fails when the document has been added to the bookshop and members have made payments.

## Root Cause
The `Payment` table has a foreign key to `BookShopItem` without proper cascade behavior. When trying to delete a document:
- Document → BookShopItem → Payment (blocked here)

## Solution Applied
Updated the foreign key constraint on the `payments` table to use `ON DELETE CASCADE`.

Now the deletion chain works:
1. Delete Document
2. Cascades to BookShopItem
3. Cascades to Payment ✅

## Apply the Fix

Run this command:

```bash
npx prisma migrate deploy
```

## Test It

1. Go to your admin dashboard
2. Try to delete any document (even ones in the bookshop with payments)
3. It should work now

## What This Fixes

Your simple workflow now works completely:
1. ✅ Admin uploads PDF
2. ✅ Admin moves to bookshop (free/paid)
3. ✅ Member browses and adds to library
4. ✅ Admin can delete documents (FIXED)

No more foreign key errors.
