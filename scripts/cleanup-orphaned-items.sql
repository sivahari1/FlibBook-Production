-- Admin cleanup script for orphaned my_jstudyroom_items
-- Removes MyJstudyroom items where:
-- 1. BookShopItem no longer exists
-- 2. Underlying Document no longer exists  
-- 3. BookShopItem is unpublished

-- First, let's see what we're dealing with
SELECT 'Orphaned by missing BookShopItem' as issue_type, COUNT(*) as count
FROM my_jstudyroom_items mji
LEFT JOIN book_shop_items bsi ON mji."bookShopItemId" = bsi.id
WHERE bsi.id IS NULL

UNION ALL

SELECT 'Orphaned by missing Document' as issue_type, COUNT(*) as count
FROM my_jstudyroom_items mji
JOIN book_shop_items bsi ON mji."bookShopItemId" = bsi.id
LEFT JOIN documents d ON bsi."documentId" = d.id
WHERE d.id IS NULL

UNION ALL

SELECT 'Orphaned by unpublished BookShopItem' as issue_type, COUNT(*) as count
FROM my_jstudyroom_items mji
JOIN book_shop_items bsi ON mji."bookShopItemId" = bsi.id
WHERE bsi."isPublished" = false;

-- Now delete the orphaned items

-- Delete items where BookShopItem doesn't exist
DELETE FROM my_jstudyroom_items 
WHERE "bookShopItemId" NOT IN (
    SELECT id FROM book_shop_items
);

-- Delete items where underlying Document doesn't exist
DELETE FROM my_jstudyroom_items 
WHERE "bookShopItemId" IN (
    SELECT bsi.id 
    FROM book_shop_items bsi 
    LEFT JOIN documents d ON bsi."documentId" = d.id 
    WHERE d.id IS NULL
);

-- Delete items where BookShopItem is unpublished
DELETE FROM my_jstudyroom_items 
WHERE "bookShopItemId" IN (
    SELECT id 
    FROM book_shop_items 
    WHERE "isPublished" = false
);

-- Verify cleanup - should return 0 for all
SELECT 'Remaining orphaned by missing BookShopItem' as verification, COUNT(*) as count
FROM my_jstudyroom_items mji
LEFT JOIN book_shop_items bsi ON mji."bookShopItemId" = bsi.id
WHERE bsi.id IS NULL

UNION ALL

SELECT 'Remaining orphaned by missing Document' as verification, COUNT(*) as count
FROM my_jstudyroom_items mji
JOIN book_shop_items bsi ON mji."bookShopItemId" = bsi.id
LEFT JOIN documents d ON bsi."documentId" = d.id
WHERE d.id IS NULL

UNION ALL

SELECT 'Remaining orphaned by unpublished BookShopItem' as verification, COUNT(*) as count
FROM my_jstudyroom_items mji
JOIN book_shop_items bsi ON mji."bookShopItemId" = bsi.id
WHERE bsi."isPublished" = false;