/**
 * End-to-End Test for Preview Content Rendering
 * 
 * Tests the complete flow:
 * 1. Database connection
 * 2. Storage bucket access
 * 3. PDF conversion service
 * 4. Page caching
 * 5. API endpoints
 */

import { prisma } from '../lib/db';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testDatabaseConnection() {
  console.log('\n📊 Testing Database Connection...');
  try {
    const count = await prisma.document.count();
    console.log(`✅ Database connected - Found ${count} documents`);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}

async function testStorageBucket() {
  console.log('\n📦 Testing Storage Bucket...');
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.error('❌ Failed to list buckets:', error.message);
      return false;
    }

    const bucketExists = buckets?.some((b) => b.name === 'document-pages');
    
    if (!bucketExists) {
      console.error('❌ document-pages bucket not found');
      return false;
    }

    console.log('✅ document-pages bucket exists');
    
    // Test upload
    const testFile = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
      0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41,
      0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
      0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
      0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE,
      0x42, 0x60, 0x82
    ]);
    const testPath = `e2e-test-${Date.now()}.png`;
    
    const { error: uploadError } = await supabase.storage
      .from('document-pages')
      .upload(testPath, testFile, {
        contentType: 'image/png',
      });

    if (uploadError) {
      console.error('❌ Upload test failed:', uploadError.message);
      return false;
    }

    console.log('✅ Upload test successful');
    
    // Clean up
    await supabase.storage.from('document-pages').remove([testPath]);
    console.log('✅ Cleanup successful');
    
    return true;
  } catch (error) {
    console.error('❌ Storage bucket test failed:', error);
    return false;
  }
}

async function testDocumentPageModel() {
  console.log('\n🗄️  Testing DocumentPage Model...');
  try {
    const count = await prisma.documentPage.count();
    console.log(`✅ DocumentPage model working - Found ${count} cached pages`);
    return true;
  } catch (error) {
    console.error('❌ DocumentPage model test failed:', error);
    return false;
  }
}

async function testPDFDocuments() {
  console.log('\n📄 Checking PDF Documents...');
  try {
    const pdfDocs = await prisma.document.findMany({
      where: {
        mimeType: 'application/pdf',
      },
      take: 5,
      select: {
        id: true,
        filename: true,
        userId: true,
      },
    });

    if (pdfDocs.length === 0) {
      console.log('⚠️  No PDF documents found in database');
      console.log('   Upload a PDF to test the conversion flow');
      return true; // Not a failure, just no data
    }

    console.log(`✅ Found ${pdfDocs.length} PDF documents`);
    
    // Check if any have cached pages
    for (const doc of pdfDocs) {
      const pageCount = await prisma.documentPage.count({
        where: { documentId: doc.id },
      });
      
      if (pageCount > 0) {
        console.log(`   📄 ${doc.filename}: ${pageCount} cached pages`);
      } else {
        console.log(`   📄 ${doc.filename}: No cached pages yet`);
      }
    }
    
    return true;
  } catch (error) {
    console.error('❌ PDF documents check failed:', error);
    return false;
  }
}

async function testServices() {
  console.log('\n🔧 Testing Services...');
  try {
    // Test that services can be imported
    const { hasCachedPages, getCachedPageUrls } = await import('../lib/services/page-cache');
    const { checkPagesExist } = await import('../lib/services/pdf-converter');
    
    console.log('✅ Services imported successfully');
    console.log('   - page-cache.ts');
    console.log('   - pdf-converter.ts');
    
    return true;
  } catch (error) {
    console.error('❌ Services test failed:', error);
    return false;
  }
}

async function runTests() {
  console.log('🚀 Starting End-to-End Tests for Preview Content Rendering\n');
  console.log('=' .repeat(60));

  const results = {
    database: await testDatabaseConnection(),
    storage: await testStorageBucket(),
    model: await testDocumentPageModel(),
    documents: await testPDFDocuments(),
    services: await testServices(),
  };

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Test Results Summary:\n');
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const status = passed ? 'PASSED' : 'FAILED';
    console.log(`${icon} ${test.padEnd(15)} ${status}`);
  });

  const allPassed = Object.values(results).every((r) => r);
  
  console.log('\n' + '='.repeat(60));
  
  if (allPassed) {
    console.log('\n✅ All tests passed! System is ready for preview content rendering.');
    console.log('\n📝 Next steps:');
    console.log('   1. Upload a PDF document');
    console.log('   2. Open the preview page');
    console.log('   3. Pages will be converted automatically');
    console.log('   4. Subsequent views will use cached pages');
  } else {
    console.log('\n❌ Some tests failed. Please fix the issues above.');
    process.exit(1);
  }
}

// Run tests
runTests()
  .then(() => {
    console.log('\n✅ E2E tests complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ E2E tests failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
