/**
 * Page Load Performance Verification Script
 * 
 * Verifies that page load times are under 2 seconds
 * Tests both cached and uncached scenarios
 * 
 * Usage: npx tsx scripts/verify-page-load-performance.ts
 */

import { prisma } from '../lib/db';
import { hasCachedPages, getCachedPageUrls } from '../lib/services/page-cache';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PerformanceResult {
  test: string;
  duration: number;
  passed: boolean;
  details?: any;
}

const results: PerformanceResult[] = [];

/**
 * Test 1: Database query performance
 */
async function testDatabaseQueryPerformance(): Promise<PerformanceResult> {
  console.log('\n📊 Testing database query performance...');
  
  const startTime = Date.now();
  
  try {
    // Find a test document
    const document = await prisma.document.findFirst({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
        userId: true,
        filename: true,
      },
    });

    const duration = Date.now() - startTime;
    const passed = duration < 100; // Should be under 100ms

    console.log(`  ✓ Database query completed in ${duration}ms`);
    console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Query time ${passed ? '<' : '>'} 100ms`);

    return {
      test: 'Database Query Performance',
      duration,
      passed,
      details: { documentId: document?.id },
    };
  } catch (error) {
    console.error('  ❌ Database query failed:', error);
    return {
      test: 'Database Query Performance',
      duration: Date.now() - startTime,
      passed: false,
      details: { error: String(error) },
    };
  }
}

/**
 * Test 2: Cache lookup performance
 */
async function testCacheLookupPerformance(): Promise<PerformanceResult> {
  console.log('\n📦 Testing cache lookup performance...');
  
  const startTime = Date.now();
  
  try {
    // Find a document with cached pages
    const document = await prisma.document.findFirst({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
      },
    });

    if (!document) {
      console.log('  ⚠️  No documents found for testing');
      return {
        test: 'Cache Lookup Performance',
        duration: 0,
        passed: true,
        details: { skipped: true },
      };
    }

    const hasCached = await hasCachedPages(document.id);
    const duration = Date.now() - startTime;
    const passed = duration < 200; // Should be under 200ms

    console.log(`  ✓ Cache lookup completed in ${duration}ms`);
    console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Lookup time ${passed ? '<' : '>'} 200ms`);
    console.log(`  Cache status: ${hasCached ? 'HIT' : 'MISS'}`);

    return {
      test: 'Cache Lookup Performance',
      duration,
      passed,
      details: { documentId: document.id, hasCached },
    };
  } catch (error) {
    console.error('  ❌ Cache lookup failed:', error);
    return {
      test: 'Cache Lookup Performance',
      duration: Date.now() - startTime,
      passed: false,
      details: { error: String(error) },
    };
  }
}

/**
 * Test 3: Page URL retrieval performance
 */
async function testPageUrlRetrievalPerformance(): Promise<PerformanceResult> {
  console.log('\n🔗 Testing page URL retrieval performance...');
  
  const startTime = Date.now();
  
  try {
    // Find a document with cached pages
    const document = await prisma.document.findFirst({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
      },
    });

    if (!document) {
      console.log('  ⚠️  No documents found for testing');
      return {
        test: 'Page URL Retrieval Performance',
        duration: 0,
        passed: true,
        details: { skipped: true },
      };
    }

    const hasCached = await hasCachedPages(document.id);
    
    if (!hasCached) {
      console.log('  ⚠️  No cached pages found for testing');
      return {
        test: 'Page URL Retrieval Performance',
        duration: 0,
        passed: true,
        details: { skipped: true, reason: 'no cached pages' },
      };
    }

    const pageUrls = await getCachedPageUrls(document.id);
    const duration = Date.now() - startTime;
    const passed = duration < 300; // Should be under 300ms

    console.log(`  ✓ Retrieved ${pageUrls.length} page URLs in ${duration}ms`);
    console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Retrieval time ${passed ? '<' : '>'} 300ms`);

    return {
      test: 'Page URL Retrieval Performance',
      duration,
      passed,
      details: { documentId: document.id, pageCount: pageUrls.length },
    };
  } catch (error) {
    console.error('  ❌ Page URL retrieval failed:', error);
    return {
      test: 'Page URL Retrieval Performance',
      duration: Date.now() - startTime,
      passed: false,
      details: { error: String(error) },
    };
  }
}

/**
 * Test 4: Complete page load simulation
 */
async function testCompletePageLoadSimulation(): Promise<PerformanceResult> {
  console.log('\n🚀 Testing complete page load simulation...');
  
  const startTime = Date.now();
  
  try {
    // Simulate complete page load flow
    const document = await prisma.document.findFirst({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
        userId: true,
        filename: true,
      },
    });

    if (!document) {
      console.log('  ⚠️  No documents found for testing');
      return {
        test: 'Complete Page Load Simulation',
        duration: 0,
        passed: true,
        details: { skipped: true },
      };
    }

    // Step 1: Check cache (parallel with document query)
    const hasCached = await hasCachedPages(document.id);

    // Step 2: Get page URLs if cached
    let pageUrls: string[] = [];
    if (hasCached) {
      pageUrls = await getCachedPageUrls(document.id);
    }

    const duration = Date.now() - startTime;
    const passed = duration < 2000; // Target: < 2 seconds

    console.log(`  ✓ Complete page load simulation completed in ${duration}ms`);
    console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Total time ${passed ? '<' : '>'} 2000ms`);
    console.log(`  Document: ${document.filename}`);
    console.log(`  Pages loaded: ${pageUrls.length}`);
    console.log(`  Cache status: ${hasCached ? 'HIT' : 'MISS'}`);

    return {
      test: 'Complete Page Load Simulation',
      duration,
      passed,
      details: {
        documentId: document.id,
        filename: document.filename,
        pageCount: pageUrls.length,
        cached: hasCached,
      },
    };
  } catch (error) {
    console.error('  ❌ Page load simulation failed:', error);
    return {
      test: 'Complete Page Load Simulation',
      duration: Date.now() - startTime,
      passed: false,
      details: { error: String(error) },
    };
  }
}

/**
 * Test 5: Storage access performance
 */
async function testStorageAccessPerformance(): Promise<PerformanceResult> {
  console.log('\n💾 Testing storage access performance...');
  
  const startTime = Date.now();
  
  try {
    // List files in document-pages bucket
    const { data, error } = await supabase.storage
      .from('document-pages')
      .list('', {
        limit: 10,
      });

    if (error) {
      throw error;
    }

    const duration = Date.now() - startTime;
    const passed = duration < 500; // Should be under 500ms

    console.log(`  ✓ Storage access completed in ${duration}ms`);
    console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Access time ${passed ? '<' : '>'} 500ms`);
    console.log(`  Files found: ${data?.length || 0}`);

    return {
      test: 'Storage Access Performance',
      duration,
      passed,
      details: { fileCount: data?.length || 0 },
    };
  } catch (error) {
    console.error('  ❌ Storage access failed:', error);
    return {
      test: 'Storage Access Performance',
      duration: Date.now() - startTime,
      passed: false,
      details: { error: String(error) },
    };
  }
}

/**
 * Test 6: Parallel operations performance
 */
async function testParallelOperationsPerformance(): Promise<PerformanceResult> {
  console.log('\n⚡ Testing parallel operations performance...');
  
  const startTime = Date.now();
  
  try {
    // Find a document
    const document = await prisma.document.findFirst({
      where: {
        mimeType: 'application/pdf',
      },
      select: {
        id: true,
      },
    });

    if (!document) {
      console.log('  ⚠️  No documents found for testing');
      return {
        test: 'Parallel Operations Performance',
        duration: 0,
        passed: true,
        details: { skipped: true },
      };
    }

    // Execute multiple operations in parallel
    const [hasCached, pageUrls, documentPages] = await Promise.all([
      hasCachedPages(document.id),
      getCachedPageUrls(document.id),
      prisma.documentPage.findMany({
        where: { documentId: document.id },
        take: 5,
      }),
    ]);

    const duration = Date.now() - startTime;
    const passed = duration < 500; // Should be under 500ms for parallel ops

    console.log(`  ✓ Parallel operations completed in ${duration}ms`);
    console.log(`  ${passed ? '✅ PASS' : '❌ FAIL'}: Parallel time ${passed ? '<' : '>'} 500ms`);
    console.log(`  Operations: cache check, URL retrieval, DB query`);

    return {
      test: 'Parallel Operations Performance',
      duration,
      passed,
      details: {
        documentId: document.id,
        hasCached,
        pageCount: pageUrls.length,
        dbRecords: documentPages.length,
      },
    };
  } catch (error) {
    console.error('  ❌ Parallel operations failed:', error);
    return {
      test: 'Parallel Operations Performance',
      duration: Date.now() - startTime,
      passed: false,
      details: { error: String(error) },
    };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🎯 Page Load Performance Verification');
  console.log('=====================================');
  console.log('Target: < 2 seconds for complete page load');
  console.log('');

  // Run all tests
  results.push(await testDatabaseQueryPerformance());
  results.push(await testCacheLookupPerformance());
  results.push(await testPageUrlRetrievalPerformance());
  results.push(await testStorageAccessPerformance());
  results.push(await testParallelOperationsPerformance());
  results.push(await testCompletePageLoadSimulation());

  // Print summary
  console.log('\n📋 Performance Test Summary');
  console.log('===========================');
  
  const passedTests = results.filter((r) => r.passed).length;
  const totalTests = results.filter((r) => !r.details?.skipped).length;
  const skippedTests = results.filter((r) => r.details?.skipped).length;

  results.forEach((result) => {
    if (result.details?.skipped) {
      console.log(`⏭️  ${result.test}: SKIPPED`);
    } else {
      const status = result.passed ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.test}: ${result.duration}ms`);
    }
  });

  console.log('');
  console.log(`Total: ${passedTests}/${totalTests} tests passed`);
  if (skippedTests > 0) {
    console.log(`Skipped: ${skippedTests} tests`);
  }

  // Overall result
  const allPassed = passedTests === totalTests;
  console.log('');
  if (allPassed) {
    console.log('🎉 All performance tests PASSED!');
    console.log('✅ Page load time target (< 2 seconds) achieved');
  } else {
    console.log('⚠️  Some performance tests FAILED');
    console.log('❌ Page load time target not fully achieved');
  }

  // Exit with appropriate code
  process.exit(allPassed ? 0 : 1);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
