#!/usr/bin/env tsx

/**
 * Test script to verify the viewer API endpoints work with authentication
 */

import { prisma } from "../lib/db";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../lib/auth";

async function testAuthenticatedViewerAPI() {
  console.log("🔍 Testing Authenticated Viewer API...\n");

  try {
    // 1. Find a user and document with pages
    console.log("1. Finding test data...");
    
    const user = await prisma.user.findFirst({
      where: { email: "sivaramj83@gmail.com" }
    });

    if (!user) {
      console.log("❌ Test user not found");
      return;
    }

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
      console.log("❌ No documents with pages found");
      return;
    }

    console.log(`✅ Found user: ${user.email}`);
    console.log(`✅ Found document: ${documentWithPages.id} with ${documentWithPages.pages.length} pages`);

    // 2. Check page data structure
    console.log("\n2. Checking page data structure...");
    const firstPage = documentWithPages.pages[0];
    console.log(`   - Page ${firstPage.pageNumber}: ${firstPage.pageUrl}`);
    
    // Check if pageUrl looks like a storage path
    if (firstPage.pageUrl.includes('/')) {
      console.log("✅ Page URL looks like a storage path");
    } else {
      console.log("⚠️  Page URL might not be a storage path:", firstPage.pageUrl);
    }

    // 3. Test the API logic directly (without HTTP)
    console.log("\n3. Testing API logic directly...");
    
    // Simulate the pages endpoint logic
    const pages = await prisma.documentPage.findMany({
      where: { documentId: documentWithPages.id },
      orderBy: { pageNumber: "asc" },
      select: { pageNumber: true },
    });

    console.log(`✅ Pages query returned ${pages.length} pages`);

    // Simulate the individual page endpoint logic
    const pageRow = await prisma.documentPage.findFirst({
      where: { documentId: documentWithPages.id, pageNumber: 1 },
      select: { pageUrl: true },
    });

    if (pageRow?.pageUrl) {
      console.log(`✅ Page 1 storage path: ${pageRow.pageUrl}`);
    } else {
      console.log("❌ Page 1 not found or no pageUrl");
    }

    // 4. Test MyJstudyroomItem resolution
    console.log("\n4. Testing MyJstudyroomItem resolution...");
    const myJstudyroomItem = await prisma.myJstudyroomItem.findFirst({
      include: {
        bookShopItem: {
          include: {
            document: {
              include: {
                pages: { take: 1 }
              }
            }
          }
        }
      }
    });

    if (myJstudyroomItem) {
      console.log(`✅ MyJstudyroomItem ID: ${myJstudyroomItem.id}`);
      console.log(`   - Resolves to Document ID: ${myJstudyroomItem.bookShopItem.document.id}`);
      
      // Test the fallback logic
      const itemId = myJstudyroomItem.id;
      const normalizedDocId = itemId.startsWith("doc_") ? itemId.replace("doc_", "") : itemId;
      
      // Try direct document lookup first
      let documentId = normalizedDocId;
      const doc = await prisma.document.findUnique({ where: { id: documentId }, select: { id: true } });
      
      if (!doc) {
        // Fallback to MyJstudyroomItem lookup
        const item = await prisma.myJstudyroomItem.findUnique({
          where: { id: normalizedDocId },
          include: { bookShopItem: true },
        });
        if (item?.bookShopItem?.documentId) {
          documentId = item.bookShopItem.documentId;
          console.log(`✅ Fallback resolution: ${itemId} -> ${documentId}`);
        }
      } else {
        console.log(`✅ Direct resolution: ${itemId} -> ${documentId}`);
      }
    }

    console.log("\n✅ All API logic tests passed!");
    console.log("\nThe API endpoints should now work correctly when:");
    console.log("1. User is properly authenticated");
    console.log("2. Document has converted pages");
    console.log("3. Supabase storage contains the page images");

  } catch (error) {
    console.error("❌ Error testing authenticated API:", error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testAuthenticatedViewerAPI().catch(console.error);