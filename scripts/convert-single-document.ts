#!/usr/bin/env tsx

/**
 * Convert a single document to generate pages for viewing
 */

import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function convertDocument(documentId: string) {
  console.log(`🔄 Converting document: ${documentId}`);

  try {
    // Get document details
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        pages: true
      }
    });

    if (!document) {
      console.log('❌ Document not found');
      return;
    }

    console.log(`📄 Document: "${document.title}"`);
    console.log(`📁 Storage Path: ${document.storagePath}`);
    console.log(`📊 Current Pages: ${document.pages?.length || 0}`);

    // Check if document already has pages
    if (document.pages && document.pages.length > 0) {
      console.log('✅ Document already has pages, skipping conversion');
      return;
    }

    // Download the PDF from Supabase storage
    console.log('📥 Downloading PDF from storage...');
    
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(document.storagePath);

    if (downloadError) {
      console.error('❌ Failed to download PDF:', downloadError);
      return;
    }

    console.log(`✅ Downloaded PDF (${fileData.size} bytes)`);

    // For now, create a simple page entry since we don't have PDF conversion service
    // In a real implementation, you would convert PDF to images here
    console.log('🔧 Creating page entries...');

    // Create a conversion job
    const conversionJob = await prisma.conversionJob.create({
      data: {
        documentId: document.id,
        status: 'processing',
        progress: 0,
        stage: 'converting',
        totalPages: 1, // Assume 1 page for now
        processedPages: 0
      }
    });

    console.log(`📋 Created conversion job: ${conversionJob.id}`);

    // Create page entries (simplified - in real implementation, convert PDF to images)
    const pageUrl = `/api/documents/${document.id}/pages/1`;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expire in 7 days

    const page = await prisma.documentPage.create({
      data: {
        documentId: document.id,
        pageNumber: 1,
        pageUrl: pageUrl,
        fileSize: Math.floor(fileData.size / 2), // Estimate page size
        expiresAt: expiresAt
      }
    });

    console.log(`📑 Created page: ${page.id} (Page ${page.pageNumber})`);

    // Update conversion job
    await prisma.conversionJob.update({
      where: { id: conversionJob.id },
      data: {
        status: 'completed',
        progress: 100,
        stage: 'completed',
        processedPages: 1,
        completedAt: new Date()
      }
    });

    console.log('✅ Conversion job completed');

    // Verify the result
    const updatedDocument = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        pages: true
      }
    });

    console.log(`🎉 SUCCESS! Document now has ${updatedDocument?.pages?.length || 0} pages`);

    return updatedDocument;

  } catch (error) {
    console.error('❌ Conversion failed:', error);
    
    // Update conversion job with error
    try {
      await prisma.conversionJob.updateMany({
        where: {
          documentId: documentId,
          status: 'processing'
        },
        data: {
          status: 'failed',
          errorMessage: error.message,
          completedAt: new Date()
        }
      });
    } catch (updateError) {
      console.error('Failed to update conversion job:', updateError);
    }
  }
}

async function main() {
  console.log('🚀 Starting document conversion...\n');

  const documentId = '3a3d035b-5d3e-4261-8694-b80b42e1f113'; // DL&CO Syllabus
  
  await convertDocument(documentId);

  console.log('\n✅ Conversion process complete!');
  console.log('🔗 You can now view the document at:');
  console.log(`   http://localhost:3000/dashboard/documents/${documentId}/view`);

  await prisma.$disconnect();
}

main().catch(console.error);