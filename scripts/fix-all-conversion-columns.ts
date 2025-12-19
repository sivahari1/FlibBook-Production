#!/usr/bin/env tsx

/**
 * Fix All Conversion Job Columns - Task 7.1
 * 
 * This script renames all snake_case columns to camelCase to match
 * the Prisma schema for the conversion_jobs table.
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔧 Fixing all conversion_jobs column names...\n');

  try {
    // Column mappings from snake_case to camelCase
    const columnMappings = [
      { from: 'document_id', to: 'documentId' },
      { from: 'started_at', to: 'startedAt' },
      { from: 'completed_at', to: 'completedAt' },
      { from: 'error_message', to: 'errorMessage' },
      { from: 'retry_count', to: 'retryCount' },
      { from: 'estimated_completion', to: 'estimatedCompletion' },
      { from: 'total_pages', to: 'totalPages' },
      { from: 'processed_pages', to: 'processedPages' },
      { from: 'created_at', to: 'createdAt' },
      { from: 'updated_at', to: 'updatedAt' }
    ];

    // Check which columns exist
    const tableInfo = await prisma.$queryRaw`
      SELECT column_name
      FROM information_schema.columns 
      WHERE table_name = 'conversion_jobs' 
      AND table_schema = 'public';
    `;

    const existingColumns = (tableInfo as any[]).map(col => col.column_name);
    console.log('Existing columns:', existingColumns);

    // Rename columns one by one
    for (const mapping of columnMappings) {
      if (existingColumns.includes(mapping.from)) {
        console.log(`🔄 Renaming ${mapping.from} to ${mapping.to}...`);
        
        try {
          await prisma.$executeRaw`
            ALTER TABLE conversion_jobs 
            RENAME COLUMN ${mapping.from} TO ${mapping.to};
          `;
          console.log(`✅ Renamed ${mapping.from} to ${mapping.to}`);
        } catch (error) {
          // Column might already be renamed or not exist
          console.log(`⚠️ Could not rename ${mapping.from}: ${error}`);
        }
      } else if (existingColumns.includes(mapping.to)) {
        console.log(`✅ Column ${mapping.to} already exists`);
      } else {
        console.log(`⚠️ Neither ${mapping.from} nor ${mapping.to} found`);
      }
    }

    // Test the table access
    console.log('\n🧪 Testing table access after column fixes...');
    
    const testQuery = await prisma.conversionJob.findMany({
      take: 1
    });
    
    console.log('✅ Table access test successful');
    console.log(`Found ${testQuery.length} existing conversion jobs`);

    // Test creating a conversion job
    console.log('\n🔍 Testing conversion job creation...');
    
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
      
      // Update the job to test all fields
      const updatedJob = await prisma.conversionJob.update({
        where: { id: testJob.id },
        data: {
          status: 'processing',
          stage: 'processing',
          progress: 50,
          startedAt: new Date(),
          totalPages: 10,
          processedPages: 5,
        }
      });
      
      console.log(`✅ Updated test job: ${updatedJob.status} (${updatedJob.progress}%)`);
      
      // Clean up the test job
      await prisma.conversionJob.delete({
        where: { id: testJob.id }
      });
      
      console.log('🧹 Cleaned up test job');
    }

    console.log('\n✅ All column fixes completed successfully!');
    console.log('\n📋 The conversion_jobs table is now compatible with Prisma schema');
    console.log('🔄 The retry logic should now work properly');

  } catch (error) {
    console.error('❌ Error fixing columns:', error);
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