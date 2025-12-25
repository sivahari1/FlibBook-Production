#!/usr/bin/env tsx

/**
 * Test script to verify the viewer API endpoints are working correctly
 */

import { prisma } from "../lib/db";

async function testViewerAPIEndpoints() {
  console.log("🔍 Testing Viewer API Endpoints...\n");

  try {
    // 1. Find a document with pages
    console.log("1. Finding a document with pages...");
    const documentWithPages = await prisma.document.findFirst({
      where: {
        pages: {
          some: {}
        }
      },
      include: {
        pages: {
          take: 3,
          orderBy: { pageNumber: 'asc' }
        }
      }
    });

    if (!documentWithPages) {
      console.log("❌ No documents with pages found. Need to convert some documents first.");
      return;
    }

    console.log(`✅ Found document: ${documentWithPages.id} with ${documentWithPages.pages.length} pages`);

    // 2. Test pages list endpoint
    console.log("\n2. Testing pages list endpoint...");
    const pagesResponse = await fetch(`http://localhost:3001/api/viewer/${documentWithPages.id}/pages`, {
      headers: {
        'Cookie': 'next-auth.session-token=test' // This will fail auth, but we can see the response
      }
    });

    console.log(`Pages endpoint status: ${pagesResponse.status}`);
    if (pagesResponse.status === 401) {
      console.log("✅ Auth is working (401 Unauthorized as expected without valid session)");
    } else {
      const pagesData = await pagesResponse.text();
      console.log(`Pages response: ${pagesData.substring(0, 200)}...`);
    }

    // 3. Test individual page endpoint
    console.log("\n3. Testing individual page endpoint...");
    const pageResponse = await fetch(`http://localhost:3001/api/viewer/${documentWithPages.id}/pages/1`, {
      headers: {
        'Cookie': 'next-auth.session-token=test'
      }
    });

    console.log(`Page endpoint status: ${pageResponse.status}`);
    if (pageResponse.status === 401) {
      console.log("✅ Auth is working (401 Unauthorized as expected without valid session)");
    } else {
      const pageData = await pageResponse.text();
      console.log(`Page response: ${pageData.substring(0, 200)}...`);
    }

    // 4. Check if we have MyJstudyroomItem data
    console.log("\n4. Checking MyJstudyroomItem data...");
    const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: {
                  take: 1
                }
              }
            }
          }
        }
      }
    });

    if (myJstudyroomItem) {
      console.log(`✅ Found MyJstudyroomItem: ${myJstudyroomItem.id}`);
      console.log(`   - BookShopItem: ${myJstudyroomItem.bookShopItem.id}`);
      console.log(`   - Document: ${myJstudyroomItem.bookShopItem.document.id}`);
      console.log(`   - Pages: ${myJstudyroomItem.bookShopItem.document.pages.length}`);

      // Test with MyJstudyroomItem ID
      console.log("\n5. Testing with MyJstudyroomItem ID...");
      const itemPagesResponse = await fetch(`http://localhost:3001/api/viewer/${myJstudyroomItem.id}/pages`, {
        headers: {
          'Cookie': 'next-auth.session-token=test'
        }
      });
      console.log(`MyJstudyroomItem pages endpoint status: ${itemPagesResponse.status}`);
    } else {
      console.log("⚠️  No MyJstudyroomItem found");
    }

    console.log("\n✅ API endpoint structure test complete!");
    console.log("\nNext steps:");
    console.log("1. Login to the application to get a valid session");
    console.log("2. Test the endpoints with proper authentication");
    console.log("3. Check browser network tab for actual API calls");

  } catch (error) {
    console.error("❌ Error testing API endpoints:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testViewerAPIEndpoints().catch(console.error);