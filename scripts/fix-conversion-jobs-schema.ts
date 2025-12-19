#!/usr/bin/env tsx

/**
 * Fix Conversion Jobs Schema - Task 7.1
 * 
 * This script fixes the schema mismatch between the Prisma model
 * and the actual database table for conversion_jobs.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing conversion_jobs schema mismatch...\n');

  try {
    // Check current table structure
    console.log('📋 Checking current table structure...');
    
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'conversion_jobs' 
      AND table_schema = 'public'
      ORDER BY ordinal_position;
    `;

    console.log('Current columns:', tableInfo);

    // Check if the table has the correct structure
    const columns = tableInfo as any[];
    const hasDocumentId = columns.some(col => col.column_name === 'documentId');
    const hasDocument_id = columns.some(col => col.column_name === 'document_id');

    if (hasDocument_id && !hasDocumentId) {
      console.log('⚠️ Found document_id column, need to rename to documentId');
      
      // Rename the column to match Prisma schema
      await prisma.$executeRaw`
        ALTER TABLE conversion_jobs 
        RENAME COLUMN document_id TO "documentId";
      `;
      
      console.log('✅ Renamed document_id to documentId');
    } else if (hasDocumentId) {
      console.log('✅ documentId column already exists');
    } else {
      console.log('❌ Neither documentId nor document_id column found');
      
      // Create the table with correct structure
      console.log('🔨 Creating conversion_jobs table with correct structure...');
      
      await prisma.$executeRaw`
        CREATE TABLE IF NOT EXISTS conversion_jobs (
          id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
          "documentId" TEXT NOT NULL,
          status TEXT DEFAULT 'queued',
          progress INTEGER DEFAULT 0,
          stage TEXT DEFAULT 'queued',
          "startedAt" TIMESTAMP,
          "completedAt" TIMESTAMP,
          "errorMessage" TEXT,
          "retryCount" INTEGER DEFAULT 0,
          priority TEXT DEFAULT 'normal',
          "estimatedCompletion" TIMESTAMP,
          "totalPages" INTEGER,
          "processedPages" INTEGER DEFAULT 0,
          "createdAt" TIMESTAMP DEFAULT NOW(),
          "updatedAt" TIMESTAMP DEFAULT NOW(),
          CONSTRAINT fk_conversion_jobs_document 
            FOREIGN KEY ("documentId") REFERENCES documents(id) ON DELETE CASCADE
        );
      `;

      // Create indexes
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_conversion_jobs_document_id 
        ON conversion_jobs("documentId");
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_conversion_jobs_status 
        ON conversion_jobs(status);
      `;
      
      await prisma.$executeRaw`
        CREATE INDEX IF NOT EXISTS idx_conversion_jobs_created_at 
        ON conversion_jobs("createdAt");
      `;

      // Create unique constraint
      await prisma.$executeRaw`
        CREATE UNIQUE INDEX IF NOT EXISTS unique_active_job 
        ON conversion_jobs("documentId", status);
      `;

      console.log('✅ Created conversion_jobs table with correct structure');
    }

    // Test the table by trying to query it
    console.log('\n🧪 Testing table access...');
    
    const testQuery = await prisma.conversionJob.findMany({
      take: 1
    });
    
    console.log('✅ Table access test successful');
    console.log(`Found ${testQuery.length} existing conversion jobs`);

    // Now let's test the conversion status API logic
    console.log('\n🔍 Testing conversion status logic...');
    
    // Find a document to test with
    const testDocument = await prisma.document.findFirst({
      where: {
        bookShopItems: {
          some: {
            myJstudyroomItems: {
              some: {}
            }
          }
        }
      }
    });

    if (testDocument) {
      console.log(`📄 Testing with document: "${testDocument.title}"`);
      
      // Try to get conversion status
      const existingJob = await prisma.conversionJob.findFirst({
        where: { documentId: testDocument.id },
        orderBy: { createdAt: 'desc' }
      });

      if (existingJob) {
        console.log(`✅ Found conversion job: ${existingJob.status} (${existingJob.progress}%)`);
      } else {
        console.log('ℹ️ No conversion job found - creating test job...');
        
        // Create a test conversion job
        const testJob = await prisma.conversionJob.create({
          data: {
            documentId: testDocument.id,
            status: 'queued',
            stage: 'queued',
            progress: 0,
            priority: 'normal',
            retryCount: 0,
          }
        });
        
        console.log(`✅ Created test conversion job: ${testJob.id}`);
        
        // Clean up the test job
        await prisma.conversionJob.delete({
          where: { id: testJob.id }
        });
        
        console.log('🧹 Cleaned up test job');
      }
    }

    console.log('\n✅ Schema fix completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Test the jStudyRoom document viewing');
    console.log('2. Check if retry logic errors are resolved');
    console.log('3. Verify "Add to jStudyRoom" functionality works');

  } catch (error) {
    console.error('❌ Error fixing schema:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main()
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  });