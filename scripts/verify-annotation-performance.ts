/**
 * Verify Annotation Loading Performance
 * Demonstrates that annotation loading meets < 1 second requirement
 */
import { prisma } from '@/lib/db';
import { annotationPerformanceMonitor } from '@/lib/performance/annotation-performance';

async function verifyAnnotationPerformance() {
  console.log('🔍 Verifying Annotation Loading Performance...\n');

  try {
    // Find a document with annotations
    const document = await prisma.document.findFirst({
      where: {
        annotations: {
          some: {}
        }
      },
      include: {
        _count: {
          select: { annotations: true }
        }
      }
    });

    if (!document) {
      console.log('⚠️  No documents with annotations found. Creating test data...\n');
      
      // Create test document
      const testDoc = await prisma.document.create({
        data: {
          title: 'Performance Test Document',
          filename: 'perf-test.pdf',
          fileSize: 1000,
          storagePath: '/test/perf',
          userId: (await prisma.user.findFirst())?.id || 'test-user'
        }
      });

      // Create test annotations
      const annotations = [];
      for (let i = 0; i < 20; i++) {
        annotations.push({
          documentId: testDoc.id,
          userId: testDoc.userId,
          pageNumber: Math.floor(i / 5) + 1,
          selectedText: `Test annotation ${i}`,
          mediaType: i % 2 === 0 ? 'AUDIO' : 'VIDEO',
          mediaUrl: `https://example.com/media/${i}`,
          visibility: 'public'
        });
      }

      await prisma.documentAnnotation.createMany({
        data: annotations
      });

      console.log(`✅ Created test document with 20 annotations\n`);
      return verifyAnnotationPerformance(); // Retry with test data
    }

    console.log(`📄 Testing with document: ${document.title}`);
    console.log(`📊 Total annotations: ${document._count.annotations}\n`);

    // Test 1: Single page load
    console.log('Test 1: Single Page Load Performance');
    console.log('─'.repeat(50));
    
    const page1Start = Date.now();
    const page1Annotations = await prisma.documentAnnotation.findMany({
      where: {
        documentId: document.id,
        pageNumber: 1
      },
      select: {
        id: true,
        documentId: true,
        userId: true,
        pageNumber: true,
        selectedText: true,
        mediaType: true,
        mediaUrl: true,
        externalUrl: true,
        visibility: true,
        createdAt: true,
        updatedAt: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
    const page1Duration = Date.now() - page1Start;

    console.log(`  Annotations found: ${page1Annotations.length}`);
    console.log(`  Load time: ${page1Duration}ms`);
    console.log(`  Status: ${page1Duration < 1000 ? '✅ PASS' : '❌ FAIL'} (< 1000ms)\n`);

    annotationPerformanceMonitor.record('single-page-load', page1Duration, {
      documentId: document.id,
      pageNumber: 1,
      count: page1Annotations.length
    });

    // Test 2: Multiple page loads
    console.log('Test 2: Multiple Page Load Performance');
    console.log('─'.repeat(50));

    const pages = [1, 2, 3, 4, 5];
    const multiStart = Date.now();
    
    const multiResults = await Promise.all(
      pages.map(page =>
        prisma.documentAnnotation.findMany({
          where: {
            documentId: document.id,
            pageNumber: page
          },
          select: {
            id: true,
            pageNumber: true,
            selectedText: true,
            mediaType: true,
          },
        })
      )
    );
    
    const multiDuration = Date.now() - multiStart;
    const avgDuration = multiDuration / pages.length;

    console.log(`  Pages loaded: ${pages.length}`);
    console.log(`  Total time: ${multiDuration}ms`);
    console.log(`  Average per page: ${avgDuration.toFixed(2)}ms`);
    console.log(`  Status: ${avgDuration < 1000 ? '✅ PASS' : '❌ FAIL'} (< 1000ms avg)\n`);

    // Test 3: Concurrent requests
    console.log('Test 3: Concurrent Request Performance');
    console.log('─'.repeat(50));

    const concurrentCount = 10;
    const concurrentStart = Date.now();

    const concurrentPromises = Array.from({ length: concurrentCount }, (_, i) =>
      prisma.documentAnnotation.findMany({
        where: {
          documentId: document.id,
          pageNumber: (i % 5) + 1
        },
        select: {
          id: true,
          pageNumber: true,
        },
      })
    );

    await Promise.all(concurrentPromises);
    const concurrentDuration = Date.now() - concurrentStart;
    const concurrentAvg = concurrentDuration / concurrentCount;

    console.log(`  Concurrent requests: ${concurrentCount}`);
    console.log(`  Total time: ${concurrentDuration}ms`);
    console.log(`  Average per request: ${concurrentAvg.toFixed(2)}ms`);
    console.log(`  Status: ${concurrentAvg < 1000 ? '✅ PASS' : '❌ FAIL'} (< 1000ms avg)\n`);

    // Test 4: With visibility filter
    console.log('Test 4: Visibility Filter Performance');
    console.log('─'.repeat(50));

    const visStart = Date.now();
    const visAnnotations = await prisma.documentAnnotation.findMany({
      where: {
        documentId: document.id,
        pageNumber: 1,
        visibility: 'public'
      },
      select: {
        id: true,
        visibility: true,
      },
    });
    const visDuration = Date.now() - visStart;

    console.log(`  Annotations found: ${visAnnotations.length}`);
    console.log(`  Load time: ${visDuration}ms`);
    console.log(`  Status: ${visDuration < 1000 ? '✅ PASS' : '❌ FAIL'} (< 1000ms)\n`);

    // Performance Summary
    console.log('Performance Summary');
    console.log('═'.repeat(50));

    const stats = annotationPerformanceMonitor.getStats();
    if (stats) {
      console.log(`  Total operations: ${stats.count}`);
      console.log(`  Average: ${stats.avg.toFixed(2)}ms`);
      console.log(`  Min: ${stats.min}ms`);
      console.log(`  Max: ${stats.max}ms`);
      console.log(`  P50 (median): ${stats.p50}ms`);
      console.log(`  P95: ${stats.p95}ms`);
      console.log(`  P99: ${stats.p99}ms`);
      console.log(`  Slow operations (>1s): ${stats.slowCount}\n`);

      const meetsSLA = annotationPerformanceMonitor.meetsPerformanceSLA();
      console.log(`  SLA Compliance (P95 < 1000ms): ${meetsSLA ? '✅ PASS' : '❌ FAIL'}\n`);
    }

    // Overall result
    const allTestsPass = 
      page1Duration < 1000 &&
      avgDuration < 1000 &&
      concurrentAvg < 1000 &&
      visDuration < 1000;

    console.log('Overall Result');
    console.log('═'.repeat(50));
    if (allTestsPass) {
      console.log('✅ ALL TESTS PASSED');
      console.log('✅ Annotation loading meets < 1 second requirement');
    } else {
      console.log('❌ SOME TESTS FAILED');
      console.log('⚠️  Performance optimization needed');
    }

  } catch (error) {
    console.error('❌ Error during performance verification:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run verification
verifyAnnotationPerformance()
  .then(() => {
    console.log('\n✅ Performance verification complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Performance verification failed:', error);
    process.exit(1);
  });
