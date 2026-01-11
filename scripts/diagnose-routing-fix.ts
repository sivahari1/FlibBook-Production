#!/usr/bin/env tsx

/**
 * Diagnose the routing fix and database connection
 */

import { prisma } from '@/lib/db';

async function diagnose() {
  console.log('🔍 Diagnosing Member Document Viewing Fix');
  console.log('==========================================\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected - found ${userCount} users\n`);

    // Check if conversionStatus field exists
    console.log('2. Checking schema migration status...');
    try {
      const docWithConversion = await prisma.document.findFirst({
        select: { 
          id: true, 
          conversionStatus: true 
        }
      });
      console.log('✅ conversionStatus field exists - migration applied\n');
    } catch (error) {
      console.log('❌ conversionStatus field missing - migration needed');
      console.log('   Run: npx prisma migrate dev --name add_conversion_tracking\n');
    }

    // Check document pages
    console.log('3. Checking document pages...');
    const pageCount = await prisma.documentPage.count();
    console.log(`📄 Found ${pageCount} document pages\n`);

    // Check documents
    console.log('4. Checking documents...');
    const documents = await prisma.document.findMany({
      take: 3,
      select: {
        id: true,
        title: true,
        contentType: true
      }
    });
    
    console.log(`📚 Found ${documents.length} documents (showing first 3):`);
    documents.forEach(doc => {
      console.log(`   - ${doc.title} (${doc.contentType}) - ID: ${doc.id}`);
    });

    console.log('\n✅ Diagnosis complete!');
    console.log('\nNext steps:');
    console.log('1. If conversionStatus field is missing, run the migration');
    console.log('2. Start the dev server: npm run dev');
    console.log('3. Test member document viewing');

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
    
    if (error instanceof Error && error.message.includes("Can't reach database")) {
      console.log('\n🔧 Database Connection Issue:');
      console.log('1. Check your .env.local file has correct DATABASE_URL');
      console.log('2. Verify Supabase project is running');
      console.log('3. Check if your IP is allowed in Supabase settings');
    }
  }
}

async function main() {
  await diagnose();
  await prisma.$disconnect();
}

if (require.main === module) {
  main();
}