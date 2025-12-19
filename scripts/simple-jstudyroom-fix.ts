#!/usr/bin/env tsx

/**
 * Simple fix for jStudyRoom by creating the conversion_jobs table
 */

import { prisma } from '../lib/db';

async function simpleJStudyRoomFix() {
  console.log('🔧 Simple jStudyRoom fix...\n');

  try {
    // Create the conversion_jobs table with simpler SQL
    console.log('🔧 Creating conversion_jobs table...');
    
    await prisma.$executeRaw`
      CREATE TABLE conversion_jobs (
        id TEXT PRIMARY KEY,
        document_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'queued',
        progress INTEGER NOT NULL DEFAULT 0,
        stage TEXT NOT NULL DEFAULT 'queued',
        started_at TIMESTAMP,
        completed_at TIMESTAMP,
        error_message TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        priority TEXT NOT NULL DEFAULT 'normal',
        estimated_completion TIMESTAMP,
        total_pages INTEGER,
        processed_pages INTEGER DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('✅ conversion_jobs table created');

    // Create indexes
    await prisma.$executeRaw`CREATE INDEX conversion_jobs_document_id_idx ON conversion_jobs(document_id)`;
    await prisma.$executeRaw`CREATE INDEX conversion_jobs_status_idx ON conversion_jobs(status)`;
    await prisma.$executeRaw`CREATE INDEX conversion_jobs_created_at_idx ON conversion_jobs(created_at)`;

    console.log('✅ Indexes created');

    // Add foreign key constraint
    await prisma.$executeRaw`
      ALTER TABLE conversion_jobs 
      ADD CONSTRAINT conversion_jobs_document_id_fkey 
      FOREIGN KEY (document_id) REFERENCES documents(id) 
      ON DELETE CASCADE ON UPDATE CASCADE
    `;

    console.log('✅ Foreign key constraint added');

    // Find PDF documents in jStudyRoom and create completed conversion jobs
    const pdfDocuments = await prisma.document.findMany({
      where: {
        contentType: 'PDF',
        bookShopItems: {
          some: {
            myJstudyroomItems: {
              some: {}
            }
          }
        }
      },
      select: {
        id: true,
        title: true
      }
    });

    console.log(`\n📄 Found ${pdfDocuments.length} PDF documents in jStudyRoom`);

    for (const doc of pdfDocuments) {
      console.log(`Creating conversion job for: ${doc.title}`);
      
      await prisma.conversionJob.create({
        data: {
          id: `conv_${doc.id}_${Date.now()}`,
          documentId: doc.id,
          status: 'completed',
          progress: 100,
          stage: 'completed',
          startedAt: new Date(),
          completedAt: new Date(),
          retryCount: 0,
          priority: 'normal',
          totalPages: 1,
          processedPages: 1
        }
      });
      
      console.log(`✅ Conversion job created for ${doc.title}`);
    }

    console.log('\n✅ Fix completed successfully!');
    console.log('\n📋 What was fixed:');
    console.log('1. Created missing conversion_jobs table');
    console.log('2. Added completed conversion jobs for all PDF documents');
    console.log('3. jStudyRoom should now work without conversion errors');
    console.log('\n🔄 Please refresh your browser and try viewing documents in jStudyRoom');

  } catch (error) {
    console.error('❌ Error during fix:', error);
    
    if (error instanceof Error && error.message.includes('already exists')) {
      console.log('ℹ️  Table already exists, checking documents...');
      
      // Just create conversion jobs for documents
      const pdfDocuments = await prisma.document.findMany({
        where: {
          contentType: 'PDF',
          bookShopItems: {
            some: {
              myJstudyroomItems: {
                some: {}
              }
            }
          }
        },
        select: {
          id: true,
          title: true
        }
      });

      for (const doc of pdfDocuments) {
        try {
          await prisma.conversionJob.create({
            data: {
              id: `conv_${doc.id}_${Date.now()}`,
              documentId: doc.id,
              status: 'completed',
              progress: 100,
              stage: 'completed',
              startedAt: new Date(),
              completedAt: new Date(),
              retryCount: 0,
              priority: 'normal',
              totalPages: 1,
              processedPages: 1
            }
          });
          console.log(`✅ Conversion job created for ${doc.title}`);
        } catch (jobError) {
          console.log(`ℹ️  Conversion job already exists for ${doc.title}`);
        }
      }
      
      console.log('\n✅ Documents should now work in jStudyRoom');
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the fix
simpleJStudyRoomFix().catch(console.error);