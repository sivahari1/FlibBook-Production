import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verifyMigration() {
  try {
    console.log('Verifying multi-content type migration...\n');

    // Check Document table columns
    console.log('Checking Document table...');
    const documentResult = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'documents'
      AND column_name IN ('contentType', 'metadata', 'thumbnailUrl', 'linkUrl')
      ORDER BY column_name;
    `;
    
    console.log('Document columns:');
    documentResult.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
    });

    // Check Document indexes
    const documentIndexes = await prisma.$queryRaw<any[]>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'documents'
      AND indexname IN ('documents_contentType_idx', 'documents_metadata_idx')
      ORDER BY indexname;
    `;
    
    console.log('\nDocument indexes:');
    documentIndexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    // Check Document constraints
    const documentConstraints = await prisma.$queryRaw<any[]>`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'documents'::regclass
      AND conname = 'documents_contentType_check';
    `;
    
    console.log('\nDocument constraints:');
    documentConstraints.forEach(con => {
      console.log(`  - ${con.conname}: ${con.definition}`);
    });

    // Check BookShopItem table columns
    console.log('\n\nChecking BookShopItem table...');
    const bookShopResult = await prisma.$queryRaw<any[]>`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'book_shop_items'
      AND column_name IN ('contentType', 'metadata', 'previewUrl', 'linkUrl')
      ORDER BY column_name;
    `;
    
    console.log('BookShopItem columns:');
    bookShopResult.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (default: ${col.column_default || 'NULL'})`);
    });

    // Check BookShopItem indexes
    const bookShopIndexes = await prisma.$queryRaw<any[]>`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'book_shop_items'
      AND indexname IN ('book_shop_items_contentType_idx', 'book_shop_items_metadata_idx')
      ORDER BY indexname;
    `;
    
    console.log('\nBookShopItem indexes:');
    bookShopIndexes.forEach(idx => {
      console.log(`  - ${idx.indexname}`);
    });

    // Check BookShopItem constraints
    const bookShopConstraints = await prisma.$queryRaw<any[]>`
      SELECT conname, pg_get_constraintdef(oid) as definition
      FROM pg_constraint
      WHERE conrelid = 'book_shop_items'::regclass
      AND conname = 'book_shop_items_contentType_check';
    `;
    
    console.log('\nBookShopItem constraints:');
    bookShopConstraints.forEach(con => {
      console.log(`  - ${con.conname}: ${con.definition}`);
    });

    console.log('\n✅ Migration verification complete!');
    
    // Verify we can query with the new columns
    console.log('\n\nTesting queries with new columns...');
    const docCount = await prisma.document.count();
    console.log(`Total documents: ${docCount}`);
    
    const bookShopCount = await prisma.bookShopItem.count();
    console.log(`Total BookShop items: ${bookShopCount}`);
    
    console.log('\n✅ All queries successful!');

  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyMigration();
