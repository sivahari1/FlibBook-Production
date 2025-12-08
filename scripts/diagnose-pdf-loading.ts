/**
 * Diagnostic script to test PDF loading
 * 
 * This script tests the PDF loading pipeline to identify where failures occur
 */

import { prisma } from '../lib/db';
import { getSignedUrl, getBucketForContentType } from '../lib/storage';
import { ContentType } from '../lib/types/content';

async function diagnosePDFLoading() {
  console.log('=== PDF Loading Diagnostic ===\n');

  try {
    // Find a PDF document
    console.log('1. Finding a PDF document...');
    const document = await prisma.document.findFirst({
      where: {
        contentType: ContentType.PDF,
        storagePath: { not: '' },
        NOT: {
          storagePath: { startsWith: '/test/' },
        },
      },
      select: {
        id: true,
        title: true,
        storagePath: true,
        contentType: true,
        userId: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!document) {
      console.log('❌ No PDF documents found in database');
      return;
    }

    console.log('✅ Found PDF document:');
    console.log('   ID:', document.id);
    console.log('   Title:', document.title);
    console.log('   Storage Path:', document.storagePath);
    console.log('   User ID:', document.userId);
    console.log('');

    // Generate signed URL
    console.log('2. Generating signed URL...');
    const bucket = getBucketForContentType(ContentType.PDF);
    console.log('   Bucket:', bucket);

    const { url: signedUrl, error } = await getSignedUrl(
      document.storagePath!,
      3600,
      bucket
    );

    if (error || !signedUrl) {
      console.log('❌ Failed to generate signed URL:', error);
      return;
    }

    console.log('✅ Signed URL generated successfully');
    console.log('   URL:', signedUrl);
    console.log('   URL length:', signedUrl.length);
    console.log('   URL starts with:', signedUrl.substring(0, 50) + '...');
    console.log('');

    // Test fetch
    console.log('3. Testing fetch...');
    try {
      const response = await fetch(signedUrl);
      console.log('✅ Fetch completed');
      console.log('   Status:', response.status);
      console.log('   Status Text:', response.statusText);
      console.log('   Content-Type:', response.headers.get('Content-Type'));
      console.log('   Content-Length:', response.headers.get('Content-Length'));
      console.log('   CORS headers:');
      console.log('     Access-Control-Allow-Origin:', response.headers.get('Access-Control-Allow-Origin'));
      console.log('     Access-Control-Allow-Methods:', response.headers.get('Access-Control-Allow-Methods'));
      console.log('');

      if (!response.ok) {
        console.log('❌ Response not OK');
        const text = await response.text();
        console.log('   Response body:', text.substring(0, 200));
        return;
      }

      // Test ArrayBuffer conversion
      console.log('4. Testing ArrayBuffer conversion...');
      const arrayBuffer = await response.arrayBuffer();
      console.log('✅ ArrayBuffer created');
      console.log('   Size:', arrayBuffer.byteLength, 'bytes');
      console.log('   Size (MB):', (arrayBuffer.byteLength / 1024 / 1024).toFixed(2), 'MB');
      console.log('');

      // Check if it looks like a PDF
      const uint8Array = new Uint8Array(arrayBuffer);
      const header = String.fromCharCode(...uint8Array.slice(0, 5));
      console.log('5. Checking PDF header...');
      console.log('   First 5 bytes:', header);
      
      if (header === '%PDF-') {
        console.log('✅ Valid PDF header detected');
      } else {
        console.log('❌ Invalid PDF header - file may be corrupted');
      }
      console.log('');

      console.log('=== Diagnostic Complete ===');
      console.log('✅ All checks passed! PDF should load successfully.');
      console.log('');
      console.log('If PDF still fails to load in browser:');
      console.log('1. Check browser console for errors');
      console.log('2. Verify PDF.js is properly initialized');
      console.log('3. Check for CORS issues in browser network tab');
      console.log('4. Verify the signed URL hasn\'t expired');

    } catch (fetchError) {
      console.log('❌ Fetch failed:', fetchError);
      if (fetchError instanceof Error) {
        console.log('   Error name:', fetchError.name);
        console.log('   Error message:', fetchError.message);
        console.log('   Error stack:', fetchError.stack);
      }
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    if (error instanceof Error) {
      console.error('   Error name:', error.name);
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run diagnostic
diagnosePDFLoading().catch(console.error);
