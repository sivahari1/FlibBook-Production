#!/usr/bin/env tsx

/**
 * Fix DocumentPage schema by adding missing columns
 * This script adds the missing cacheKey and other optimization columns
 * to the document_pages table using the pooled connection.
 */

import { config } from 'dotenv'

// Load environment variables
config()

async function fixDocumentPagesSchema(): Promise<void> {
  console.log('🔧 Fixing DocumentPage schema...\n')

  try {
    const { prisma: db } = await import('../lib/db')
    
    console.log('📋 Checking current document_pages table structure...')
    
    // Check if the table exists and what columns it has
    const result = await db.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'document_pages' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    ` as Array<{column_name: string, data_type: string, is_nullable: string}>

    console.log('Current columns:')
    result.forEach(col => {
      console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`)
    })

    // Check which columns are missing
    const existingColumns = result.map(col => col.column_name)
    const requiredColumns = [
      'cacheKey',
      'cacheExpiresAt', 
      'cacheHitCount',
      'lastAccessedAt',
      'version',
      'generationMethod',
      'qualityLevel',
      'processingTimeMs',
      'optimizationApplied',
      'format'
    ]

    const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col))
    
    if (missingColumns.length === 0) {
      console.log('✅ All required columns already exist!')
      return
    }

    console.log(`\n🔧 Adding ${missingColumns.length} missing columns...`)
    
    // Add missing columns one by one
    for (const column of missingColumns) {
      try {
        let sql = ''
        
        switch (column) {
          case 'cacheKey':
            sql = `ALTER TABLE document_pages ADD COLUMN "cacheKey" TEXT;`
            break
          case 'cacheExpiresAt':
            sql = `ALTER TABLE document_pages ADD COLUMN "cacheExpiresAt" TIMESTAMP(3);`
            break
          case 'cacheHitCount':
            sql = `ALTER TABLE document_pages ADD COLUMN "cacheHitCount" INTEGER NOT NULL DEFAULT 0;`
            break
          case 'lastAccessedAt':
            sql = `ALTER TABLE document_pages ADD COLUMN "lastAccessedAt" TIMESTAMP(3);`
            break
          case 'version':
            sql = `ALTER TABLE document_pages ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;`
            break
          case 'generationMethod':
            sql = `ALTER TABLE document_pages ADD COLUMN "generationMethod" TEXT NOT NULL DEFAULT 'standard';`
            break
          case 'qualityLevel':
            sql = `ALTER TABLE document_pages ADD COLUMN "qualityLevel" TEXT NOT NULL DEFAULT 'standard';`
            break
          case 'processingTimeMs':
            sql = `ALTER TABLE document_pages ADD COLUMN "processingTimeMs" INTEGER;`
            break
          case 'optimizationApplied':
            sql = `ALTER TABLE document_pages ADD COLUMN "optimizationApplied" BOOLEAN NOT NULL DEFAULT false;`
            break
          case 'format':
            sql = `ALTER TABLE document_pages ADD COLUMN "format" TEXT NOT NULL DEFAULT 'jpeg';`
            break
        }
        
        if (sql) {
          await db.$executeRawUnsafe(sql)
          console.log(`  ✅ Added column: ${column}`)
        }
      } catch (error) {
        console.log(`  ⚠️  Column ${column} might already exist or error occurred:`, (error as Error).message)
      }
    }

    // Add indexes if they don't exist
    console.log('\n🔧 Adding missing indexes...')
    
    try {
      await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "document_pages_cacheKey_idx" ON "document_pages"("cacheKey");`)
      console.log('  ✅ Added cacheKey index')
    } catch (error) {
      console.log('  ⚠️  cacheKey index might already exist')
    }

    console.log('\n✅ Schema fix completed!')
    
    // Test the fix by running a simple query
    console.log('\n🧪 Testing the fix...')
    const testResult = await db.documentPage.findMany({
      take: 1,
      select: {
        id: true,
        cacheKey: true,
        version: true,
        format: true
      }
    })
    
    console.log('✅ Test query successful - schema is now compatible!')
    
  } catch (error) {
    console.error('❌ Schema fix failed:', error)
    throw error
  }
}

// Run the fix
fixDocumentPagesSchema().catch(console.error)