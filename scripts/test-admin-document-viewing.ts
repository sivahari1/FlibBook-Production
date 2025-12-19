#!/usr/bin/env tsx

/**
 * Test admin document viewing to identify the exact issue
 */

import { PrismaClient } from '@prisma/client';
import { getSignedUrl, getBucketForContentType } from '@/lib/storage';
import { ContentType } from '@/lib/types/content';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Testing Admin Document Viewing\n');

  try {
    // Get a document with pages
    const document = await prisma.document.findFirst({
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

    if (!document) {
      console.log('❌ No documents with pages found');
      return;
    }

    console.log(`📄 Testing with document: "${document.title}"`);
    console.log(`   ID: ${document.id}`);
    console.log(`   Content Type: ${document.contentType}`);
    console.log(`   MIME Type: ${document.mimeType}`);
    console.log(`   Storage Path: ${document.storagePath}`);
    console.log(`   Pages: ${document.pages.length}`);

    // Test signed URL generation
    if (document.storagePath) {
      console.log('\n🔗 Testing Signed URL Generation:');
      
      const contentType = (document.contentType as ContentType) || ContentType.PDF;
      const bucket = getBucketForContentType(contentType);
      
      console.log(`   Bucket: ${bucket}`);
      
      const { url: signedUrl, error } = await getSignedUrl(
        document.storagePath,
        3600, // 1 hour
        bucket
      );

      if (error) {
        console.log(`   ❌ Error generating signed URL: ${error}`);
      } else if (signedUrl) {
        console.log(`   ✅ Signed URL generated successfully`);
        console.log(`   URL length: ${signedUrl.length} characters`);
        console.log(`   URL starts with: ${signedUrl.substring(0, 100)}...`);
        
        // Test if the URL is accessible
        console.log('\n🌐 Testing URL Accessibility:');
        try {
          const response = await fetch(signedUrl, { method: 'HEAD' });
          console.log(`   Status: ${response.status}`);
          console.log(`   Content-Type: ${response.headers.get('content-type')}`);
          console.log(`   Content-Length: ${response.headers.get('content-length')}`);
          
          if (response.ok) {
            console.log('   ✅ URL is accessible');
          } else {
            console.log('   ❌ URL is not accessible');
          }
        } catch (fetchError) {
          console.log(`   ❌ Fetch error: ${fetchError}`);
        }
      } else {
        console.log('   ❌ No signed URL returned');
      }
    }

    // Test pages API with proper authentication simulation
    console.log('\n🔧 Testing Pages API (simulated):');
    console.log(`   Document has ${document.pages.length} pages in database`);
    
    for (const page of document.pages) {
      console.log(`   Page ${page.pageNumber}: ${page.pageUrl}`);
      console.log(`     File Size: ${page.fileSize} bytes`);
      console.log(`     Expires: ${page.expiresAt}`);
    }

    // Check environment variables
    console.log('\n🌍 Environment Check:');
    console.log(`   SUPABASE_URL: ${process.env.SUPABASE_URL ? 'Set' : 'Missing'}`);
    console.log(`   SUPABASE_ANON_KEY: ${process.env.SUPABASE_ANON_KEY ? 'Set' : 'Missing'}`);
    console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Set' : 'Missing'}`);

    // Recommendations
    console.log('\n💡 Analysis:');
    
    if (!document.storagePath) {
      console.log('❌ Document has no storage path - file may be missing');
    } else {
      console.log('✅ Document has storage path');
    }
    
    if (document.pages.length === 0) {
      console.log('❌ Document has no pages - conversion failed');
    } else {
      console.log(`✅ Document has ${document.pages.length} pages`);
    }

    console.log('\n🎯 Next Steps for Admin Viewing:');
    console.log('1. Ensure signed URL generation works');
    console.log('2. Check if PDF viewer component receives the URL');
    console.log('3. Verify PDF.js can load the signed URL');
    console.log('4. Check browser console for JavaScript errors');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);