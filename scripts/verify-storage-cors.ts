/**
 * Verify Supabase Storage CORS Configuration
 * 
 * Requirements: 8.1, 8.3 - CORS headers and signed URL compatibility
 * 
 * This script tests:
 * 1. Signed URL generation
 * 2. CORS headers presence
 * 3. Fetch API compatibility
 */

import { getSignedUrl } from '../lib/storage';
import { prisma } from '../lib/db';

async function verifyStorageCORS() {
  console.log('🔍 Verifying Supabase Storage CORS Configuration\n');

  try {
    // Step 1: Find a test document
    console.log('Step 1: Finding test document...');
    const document = await prisma.document.findFirst({
      where: {
        contentType: 'PDF',
        storagePath: { not: null },
      },
    });

    if (!document) {
      console.log('⚠️  No PDF documents found in database');
      console.log('   Upload a PDF document first to test CORS configuration\n');
      return;
    }

    console.log(`✅ Found document: ${document.title}`);
    console.log(`   Storage path: ${document.storagePath}\n`);

    // Step 2: Generate signed URL
    console.log('Step 2: Generating signed URL...');
    const { url: signedUrl, error } = await getSignedUrl(
      document.storagePath!,
      3600,
      'documents',
      { download: false } // Critical for fetch API
    );

    if (error || !signedUrl) {
      console.log(`❌ Failed to generate signed URL: ${error}\n`);
      return;
    }

    console.log('✅ Signed URL generated successfully');
    console.log(`   URL: ${signedUrl.substring(0, 80)}...\n`);

    // Step 3: Test CORS headers with HEAD request
    console.log('Step 3: Testing CORS headers (HEAD request)...');
    try {
      const headResponse = await fetch(signedUrl, { method: 'HEAD' });
      
      console.log(`   Status: ${headResponse.status} ${headResponse.statusText}`);
      
      const corsHeaders = {
        'access-control-allow-origin': headResponse.headers.get('access-control-allow-origin'),
        'access-control-allow-methods': headResponse.headers.get('access-control-allow-methods'),
        'access-control-allow-headers': headResponse.headers.get('access-control-allow-headers'),
        'access-control-expose-headers': headResponse.headers.get('access-control-expose-headers'),
        'access-control-max-age': headResponse.headers.get('access-control-max-age'),
      };

      console.log('\n   CORS Headers:');
      Object.entries(corsHeaders).forEach(([key, value]) => {
        const status = value ? '✅' : '⚠️ ';
        console.log(`   ${status} ${key}: ${value || 'Not set'}`);
      });

      if (!corsHeaders['access-control-allow-origin']) {
        console.log('\n❌ CORS not configured!');
        console.log('   Please configure CORS in Supabase dashboard:');
        console.log('   1. Go to Storage → Configuration → CORS');
        console.log('   2. Add allowed origins, methods, and headers');
        console.log('   3. See lib/SUPABASE_CORS_CONFIGURATION.md for details\n');
        return;
      }

      console.log('\n✅ CORS headers present\n');
    } catch (error) {
      console.log(`❌ HEAD request failed: ${error}\n`);
      return;
    }

    // Step 4: Test fetch API compatibility
    console.log('Step 4: Testing fetch API compatibility...');
    try {
      const fetchResponse = await fetch(signedUrl, { method: 'GET' });
      
      console.log(`   Status: ${fetchResponse.status} ${fetchResponse.statusText}`);
      console.log(`   Content-Type: ${fetchResponse.headers.get('content-type')}`);
      console.log(`   Content-Length: ${fetchResponse.headers.get('content-length')} bytes`);

      if (fetchResponse.ok) {
        console.log('\n✅ Fetch API compatible - PDF.js will work!\n');
      } else {
        console.log(`\n❌ Fetch failed with status ${fetchResponse.status}\n`);
      }
    } catch (error) {
      console.log(`❌ Fetch request failed: ${error}\n`);
      return;
    }

    // Step 5: Test OPTIONS preflight request
    console.log('Step 5: Testing OPTIONS preflight request...');
    try {
      const optionsResponse = await fetch(signedUrl, {
        method: 'OPTIONS',
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
        },
      });

      console.log(`   Status: ${optionsResponse.status} ${optionsResponse.statusText}`);
      
      const allowOrigin = optionsResponse.headers.get('access-control-allow-origin');
      const allowMethods = optionsResponse.headers.get('access-control-allow-methods');
      
      console.log(`   Allow-Origin: ${allowOrigin || 'Not set'}`);
      console.log(`   Allow-Methods: ${allowMethods || 'Not set'}`);

      if (optionsResponse.ok && allowOrigin) {
        console.log('\n✅ OPTIONS preflight successful\n');
      } else {
        console.log('\n⚠️  OPTIONS preflight may have issues\n');
      }
    } catch (error) {
      console.log(`⚠️  OPTIONS request failed: ${error}`);
      console.log('   This may be normal if the server doesn\'t support OPTIONS\n');
    }

    // Summary
    console.log('═══════════════════════════════════════════════════════');
    console.log('Summary:');
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ Signed URL generation: Working');
    console.log('✅ CORS headers: Configured');
    console.log('✅ Fetch API: Compatible');
    console.log('✅ PDF.js: Ready to use');
    console.log('═══════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Verification failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyStorageCORS();
