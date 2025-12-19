#!/usr/bin/env tsx

/**
 * Diagnose JStudyRoom document viewing issues
 * This script will check various components that could cause loading failures
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function diagnoseViewingIssue() {
  console.log('🔍 Diagnosing JStudyRoom document viewing issue...\n');

  try {
    // 1. Check database connection
    console.log('1. Testing database connection...');
    const userCount = await prisma.user.count();
    console.log(`✅ Database connected - ${userCount} users found\n`);

    // 2. Check for documents in my-jstudyroom
    console.log('2. Checking My JStudyRoom documents...');
    const myJStudyRoomItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        },
        user: true
      },
      take: 5
    });
    
    console.log(`📚 Found ${myJStudyRoomItems.length} items in My JStudyRoom`);
    
    if (myJStudyRoomItems.length > 0) {
      console.log('\nRecent items:');
      myJStudyRoomItems.forEach((item, index) => {
        console.log(`  ${index + 1}. ${item.bookShopItem.title} (Doc ID: ${item.bookShopItem.document.id})`);
        console.log(`     User: ${item.user.email}`);
        console.log(`     Document Type: ${item.bookShopItem.document.contentType}`);
        console.log(`     Has Pages: ${item.bookShopItem.document.totalPages || 'Unknown'} pages`);
        console.log(`     Status: ${item.bookShopItem.document.status}`);
        console.log(`     Is Free: ${item.isFree}`);
        console.log('');
      });
    }

    // 3. Check document pages for a specific document
    if (myJStudyRoomItems.length > 0) {
      const testDoc = myJStudyRoomItems[0];
      console.log(`3. Checking pages for document: ${testDoc.bookShopItem.title}`);
      
      const pages = await prisma.documentPage.findMany({
        where: { documentId: testDoc.bookShopItem.document.id },
        take: 3
      });
      
      console.log(`📄 Found ${pages.length} pages for this document`);
      if (pages.length > 0) {
        pages.forEach((page, index) => {
          console.log(`  Page ${page.pageNumber}: ${page.pageUrl ? '✅ Has page URL' : '❌ Missing page URL'}`);
        });
      } else {
        console.log('❌ No pages found - this could be the issue!');
      }
      console.log('');
    }

    // 4. Check Supabase storage configuration
    console.log('4. Testing Supabase storage...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase environment variables missing');
      return;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test storage bucket access
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.log('❌ Error accessing Supabase storage:', bucketsError.message);
    } else {
      console.log('✅ Supabase storage accessible');
      console.log('Available buckets:', buckets?.map(b => b.name).join(', '));
    }

    // 5. Check for common issues
    console.log('\n5. Common issue checks:');
    
    // Check for documents without pages
    const docsWithoutPages = await prisma.document.findMany({
      where: {
        pages: {
          none: {}
        }
      },
      take: 5
    });
    
    if (docsWithoutPages.length > 0) {
      console.log(`⚠️  Found ${docsWithoutPages.length} completed documents without pages:`);
      docsWithoutPages.forEach(doc => {
        console.log(`   - ${doc.title} (ID: ${doc.id})`);
      });
    } else {
      console.log('✅ All completed documents have pages');
    }

    // Check for documents with processing status
    const processingDocs = await prisma.document.count();
    
    console.log(`📊 Total documents in database: ${processingDocs}`);

  } catch (error) {
    console.error('❌ Error during diagnosis:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the diagnosis
diagnoseViewingIssue().catch(console.error);