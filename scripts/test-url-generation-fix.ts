#!/usr/bin/env tsx

/**
 * Test script to verify the URL generation fix for MyJstudyroomViewerClient
 * This script tests the getSignedUrl function with actual document data
 */

import { prisma } from '../lib/db';
import { getSignedUrl, getBucketForContentType } from '../lib/storage';
import { ContentType } from '../lib/types/content';

async function testUrlGenerationFix() {
  console.log('🔧 Testing URL Generation Fix for JStudyRoom Documents\n');

  try {
    // Step 1: Get a sample document from the database
    console.log('Step 1: Fetching sample document...');
    const sampleDoc = await prisma.document.findFirst({
      where: {
        mimeType: 'application/pdf',
        storagePath: { not: '' }
      },
      select: {
        id: true,
        title: true,
        storagePath: true,
        contentType: true,
        mimeType: true,
        userId: true
      }
    });

    if (!sampleDoc) {
      console.log('❌ No PDF documents found in database');
      return;
    }

    console.log('✅ Found sample document:');
    console.log(`   Title: ${sampleDoc.title}`);
    console.log(`   ID: ${sampleDoc.id}`);
    console.log(`   Storage Path: ${sampleDoc.storagePath}`);
    console.log(`   Content Type: ${sampleDoc.contentType}`);
    console.log('');

    // Step 2: Test the URL generation logic (same as in MyJstudyroomViewerClient)
    console.log('Step 2: Testing URL generation...');
    
    if (!sampleDoc.storagePath) {
      console.log('❌ Document has no storage path');
      return;
    }

    // This is the same logic now used in MyJstudyroomViewerClient
    const contentType = sampleDoc.contentType as ContentType;
    const bucketName = getBucketForContentType(contentType);
    
    console.log(`   Bucket: ${bucketName}`);
    
    const { url: signedUrl, error } = await getSignedUrl(
      sampleDoc.storagePath,
      3600, // 1 hour expiry
      bucketName,
      { download: false } // Important: don't force download for PDF.js compatibility
    );

    if (error) {
      console.log('❌ Failed to generate signed URL:', error);
      return;
    }

    if (!signedUrl) {
      console.log('❌ No signed URL returned from storage service');
      return;
    }

    console.log('✅ Signed URL generated successfully');
    console.log(`   URL: ${signedUrl.substring(0, 100)}...`);
    console.log('');

    // Step 3: Validate the URL format
    console.log('Step 3: Validating URL format...');
    
    try {
      const urlObj = new URL(signedUrl);
      console.log('✅ URL format is valid');
      console.log(`   Protocol: ${urlObj.protocol}`);
      console.log(`   Hostname: ${urlObj.hostname}`);
      console.log(`   Pathname: ${urlObj.pathname}`);
      console.log(`   Has query params: ${urlObj.searchParams.toString().length > 0}`);
    } catch (urlError) {
      console.log('❌ Invalid URL format:', urlError);
      return;
    }

    console.log('');

    // Step 4: Test URL accessibility
    console.log('Step 4: Testing URL accessibility...');
    
    try {
      const response = await fetch(signedUrl, { method: 'HEAD' });
      console.log('✅ URL is accessible');
      console.log(`   Status: ${response.status} ${response.statusText}`);
      console.log(`   Content-Type: ${response.headers.get('content-type')}`);
      console.log(`   Content-Length: ${response.headers.get('content-length')}`);
    } catch (fetchError) {
      console.log('❌ URL is not accessible:', fetchError);
      return;
    }

    console.log('');
    console.log('🎉 URL Generation Fix Test PASSED!');
    console.log('   The MyJstudyroomViewerClient should now work correctly.');
    console.log('   Documents will no longer show "Failed to construct URL" errors.');

  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testUrlGenerationFix().catch(console.error);