#!/usr/bin/env tsx

/**
 * Test the unified viewer access API
 */

import { prisma } from '../lib/db';
import { generateSignedUrl } from '../lib/supabase/server';

async function testViewerAPI() {
  console.log('🧪 Testing Viewer Access API...\n');

  try {
    // Get a test document
    const document = await prisma.document.findFirst({
      where: {
        contentType: 'PDF'
      }
    });

    if (!document) {
      console.log('❌ No PDF documents found for testing');
      return;
    }

    console.log(`📄 Testing with document: ${document.title}`);
    console.log(`   ID: ${document.id}`);
    console.log(`   Content Type: ${document.contentType}`);
    console.log(`   Storage Path: ${document.storagePath}`);

    // Test Supabase signed URL generation
    console.log('\n🔗 Testing Supabase signed URL generation...');
    
    const result = await generateSignedUrl('documents', document.storagePath, 3600);
    
    if (result.ok) {
      console.log('✅ Successfully generated signed URL');
      console.log(`   URL length: ${result.signedUrl.length} characters`);
      console.log(`   URL starts with: ${result.signedUrl.substring(0, 50)}...`);
      
      // Test if URL is accessible
      console.log('\n🌐 Testing URL accessibility...');
      try {
        const response = await fetch(result.signedUrl, { method: 'HEAD' });
        if (response.ok) {
          console.log('✅ URL is accessible');
          console.log(`   Content-Type: ${response.headers.get('content-type')}`);
          console.log(`   Content-Length: ${response.headers.get('content-length')}`);
        } else {
          console.log(`❌ URL returned status: ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Error accessing URL: ${error}`);
      }
    } else {
      console.log(`❌ Failed to generate signed URL: ${result.error}`);
    }

    // Test access control logic
    console.log('\n🔐 Testing access control logic...');
    
    // Get admin user
    const adminUser = await prisma.user.findFirst({
      where: { userRole: 'ADMIN' }
    });

    if (adminUser) {
      console.log(`✅ Admin user "${adminUser.email}" should have access to any document`);
    }

    // Get member user with MyJstudyRoom items
    const memberWithItems = await prisma.user.findFirst({
      where: {
        userRole: 'MEMBER',
        myJstudyroomItems: {
          some: {}
        }
      },
      include: {
        myJstudyroomItems: {
          include: {
            bookShopItem: {
              include: {
                document: true
              }
            }
          }
        }
      }
    });

    if (memberWithItems && memberWithItems.myJstudyroomItems.length > 0) {
      const accessibleDoc = memberWithItems.myJstudyroomItems[0].bookShopItem.document;
      console.log(`✅ Member user "${memberWithItems.email}" should have access to document "${accessibleDoc.title}"`);
      console.log(`   Document ID: ${accessibleDoc.id}`);
    }

    console.log('\n📋 API Testing Instructions:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Test the API endpoint manually:');
    console.log(`   GET http://localhost:3000/api/viewer/document/${document.id}/access`);
    console.log('3. Test with different authentication states:');
    console.log('   - No authentication (should return 401)');
    console.log('   - Admin user (should return signed URL)');
    console.log('   - Member user with access (should return signed URL)');
    console.log('   - Member user without access (should return 403)');

  } catch (error) {
    console.error('❌ Error testing viewer API:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testViewerAPI().catch(console.error);