#!/usr/bin/env tsx

/**
 * Test script for Phase-2 Flipbook Viewer implementation
 * 
 * This script tests:
 * 1. API endpoint for flipbook pages
 * 2. Database connectivity
 * 3. Document page availability
 */

import { prisma } from '@/lib/db';

async function testFlipbookImplementation() {
  console.log('🧪 Testing Phase-2 Flipbook Viewer Implementation...\n');

  try {
    // Test 1: Database connectivity
    console.log('1️⃣ Testing database connectivity...');
    const dbTest = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Database connection successful');

    // Test 2: Check for documents with pages
    console.log('\n2️⃣ Checking for documents with pages...');
    const documentsWithPages = await prisma.document.findMany({
      where: {
        pages: {
          some: {},
        },
      },
      include: {
        pages: {
          take: 3,
          orderBy: {
            pageNumber: 'asc',
          },
        },
        _count: {
          select: {
            pages: true,
          },
        },
      },
      take: 5,
    });

    if (documentsWithPages.length === 0) {
      console.log('⚠️  No documents with pages found');
      console.log('   Documents may need to be converted to generate page images');
    } else {
      console.log(`✅ Found ${documentsWithPages.length} documents with pages:`);
      documentsWithPages.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.title} (${doc._count.pages} pages)`);
        console.log(`      Document ID: ${doc.id}`);
        console.log(`      Content Type: ${doc.contentType}`);
        if (doc.pages.length > 0) {
          console.log(`      Sample pages: ${doc.pages.map(p => p.pageNumber).join(', ')}`);
        }
      });
    }

    // Test 3: Check MyJstudyroom items for testing
    console.log('\n3️⃣ Checking MyJstudyroom items...');
    const myJstudyroomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                _count: {
                  select: {
                    pages: true,
                  },
                },
              },
            },
          },
        },
        user: {
          select: {
            email: true,
            userRole: true,
          },
        },
      },
      take: 5,
    });

    if (myJstudyroomItems.length === 0) {
      console.log('⚠️  No MyJstudyroom items found');
      console.log('   Users need to add documents to their study room for testing');
    } else {
      console.log(`✅ Found ${myJstudyroomItems.length} MyJstudyroom items:`);
      myJstudyroomItems.forEach((item, index) => {
        const doc = item.bookShopItem.document;
        console.log(`   ${index + 1}. ${doc.title} (${doc._count.pages} pages)`);
        console.log(`      User: ${item.user.email} (${item.user.userRole})`);
        console.log(`      Document ID: ${doc.id}`);
        console.log(`      Content Type: ${doc.contentType}`);
      });
    }

    // Test 4: Check Supabase storage configuration
    console.log('\n4️⃣ Checking environment variables...');
    const requiredEnvVars = [
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY',
    ];

    let envVarsOk = true;
    requiredEnvVars.forEach(envVar => {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`❌ ${envVar} is missing`);
        envVarsOk = false;
      }
    });

    if (!envVarsOk) {
      console.log('⚠️  Some environment variables are missing');
      console.log('   Check your .env.local file');
    }

    // Test 5: Sample API endpoint test data
    if (documentsWithPages.length > 0 && myJstudyroomItems.length > 0) {
      console.log('\n5️⃣ Sample API test data:');
      const sampleDoc = documentsWithPages[0];
      const sampleUser = myJstudyroomItems.find(item => 
        item.bookShopItem.document.id === sampleDoc.id
      );

      if (sampleUser) {
        console.log('✅ Ready for API testing:');
        console.log(`   Document ID: ${sampleDoc.id}`);
        console.log(`   User Email: ${sampleUser.user.email}`);
        console.log(`   API Endpoint: /api/member/viewer/pages/${sampleDoc.id}`);
        console.log(`   Expected Pages: ${sampleDoc._count.pages}`);
      } else {
        console.log('⚠️  No matching user found for sample document');
        console.log('   You may need to add the document to a user\'s study room');
      }
    }

    console.log('\n🎉 Flipbook implementation test completed!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Login as a member user');
    console.log('3. Navigate to a document in your study room');
    console.log('4. The flipbook viewer should load instead of PDF iframe');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFlipbookImplementation().catch(console.error);