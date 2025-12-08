-- Fix document deletion by updating Payment foreign key constraint
-- This allows documents to be deleted even if they have bookshop items with payments

BEGIN;

-- Drop the existing foreign key constraint
ALTER TABLE "payments" DROP CONSTRAINT IF EXISTS "payments_bookShopItemId_fkey";

-- Add new foreign key with CASCADE on delete
-- When a bookshop item is deleted, associated payments are also deleted
ALTER TABLE "payments" 
  ADD CONSTRAINT "payments_bookShopItemId_fkey" 
  FOREIGN KEY ("bookShopItemId") 
  REFERENCES "book_shop_items"("id") 
  ON DELETE CASCADE 
  ON UPDATE CASCADE;

COMMIT;
