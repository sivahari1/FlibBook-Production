#!/usr/bin/env tsx

import { prisma } from "../lib/db";

async function diagnoseBookShopSchema() {
  console.log("🔍 Diagnosing BookShop schema...");
  
  try {
    // Check if BookShopItem table exists and what columns it has
    console.log("📊 Checking BookShopItem table structure...");
    
    // Try a simple count first
    const count = await prisma.bookShopItem.count();
    console.log(`✅ BookShopItem table exists with ${count} records`);
    
    // Try to get one record to see the structure
    const sample = await prisma.bookShopItem.findFirst({
      include: { document: true }
    });
    
    if (sample) {
      console.log("📊 Sample BookShopItem structure:", {
        id: sample.id,
        documentId: sample.documentId,
        title: sample.title,
        description: sample.description,
        category: sample.category,
        isFree: sample.isFree,
        price: sample.price,
        isPublished: sample.isPublished,
        contentType: sample.contentType,
        createdAt: sample.createdAt,
        updatedAt: sample.updatedAt,
        document: sample.document ? {
          id: sample.document.id,
          title: sample.document.title,
          filename: sample.document.filename,
          contentType: sample.document.contentType,
          mimeType: sample.document.mimeType
        } : null
      });
    } else {
      console.log("📊 No BookShopItem records found");
    }
    
  } catch (error: any) {
    console.error("❌ Error accessing BookShopItem:", {
      message: error.message,
      code: error.code,
      meta: error.meta
    });
  }
  
  try {
    // Check Document table
    console.log("📊 Checking Document table...");
    const docCount = await prisma.document.count();
    console.log(`✅ Document table exists with ${docCount} records`);
  } catch (error: any) {
    console.error("❌ Error accessing Document table:", error.message);
  }
  
  await prisma.$disconnect();
}

diagnoseBookShopSchema().catch(console.error);