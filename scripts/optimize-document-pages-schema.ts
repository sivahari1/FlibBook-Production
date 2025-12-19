#!/usr/bin/env tsx

/**
 * Script to optimize document pages schema
 * Adds cache metadata, versioning, and performance indexes
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function optimizeDocumentPagesSchema() {
  console.log('🔧 Optimizing document pages schema...');
  
  try {
    // Check if the migration has been applied by looking for new columns
    const result = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'document_pages' 
      AND column_name IN ('cache_key', 'version', 'generation_method')
    ` as any[];
    
    if (result.length === 0) {
      console.log('❌ Migration not yet applied. Please run: npx prisma migrate deploy');
      return;
    }
    
    console.log('✅ Schema optimization columns found');
    
    // Update existing pages with default values where needed
    const updateResult = await prisma.documentPage.updateMany({
      where: {
        version: null
      },
      data: {
        version: 1,
        generationMethod: 'standard',
        qualityLevel: 'standard',
        format: 'jpeg',
        optimizationApplied: false,
        cacheHitCount: 0
      }
    });
    
    console.log(`✅ Updated ${updateResult.count} document pages with default values`);
    
    // Get statistics about the optimized schema
    const stats = await prisma.documentPage.aggregate({
      _count: {
        id: true
      },
      _avg: {
        cacheHitCount: true,
        processingTimeMs: true
      },
      _max: {
        version: true
      }
    });
    
    console.log('📊 Document Pages Statistics:');
    console.log(`   Total pages: ${stats._count.id}`);
    console.log(`   Average cache hits: ${stats._avg.cacheHitCount?.toFixed(2) || 0}`);
    console.log(`   Average processing time: ${stats._avg.processingTimeMs?.toFixed(2) || 'N/A'} ms`);
    console.log(`   Max version: ${stats._max.version || 1}`);
    
    // Test the new indexes by running some performance queries
    console.log('\n🚀 Testing performance indexes...');
    
    const start = Date.now();
    
    // Test cache key index
    await prisma.documentPage.findMany({
      where: {
        cacheKey: {
          not: null
        }
      },
      take: 10
    });
    
    // Test version index
    await prisma.documentPage.findMany({
      where: {
        version: {
          gte: 1
        }
      },
      take: 10
    });
    
    // Test composite index
    await prisma.documentPage.findMany({
      where: {
        cacheExpiresAt: {
          gte: new Date()
        }
      },
      orderBy: {
        cacheHitCount: 'desc'
      },
      take: 10
    });
    
    const queryTime = Date.now() - start;
    console.log(`✅ Performance queries completed in ${queryTime}ms`);
    
    console.log('\n🎉 Document pages schema optimization completed successfully!');
    
  } catch (error) {
    console.error('❌ Error optimizing document pages schema:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the optimization
optimizeDocumentPagesSchema()
  .catch((error) => {
    console.error('Failed to optimize document pages schema:', error);
    process.exit(1);
  });