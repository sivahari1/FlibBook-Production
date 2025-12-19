#!/usr/bin/env tsx

/**
 * Diagnose current document viewing issues in both admin and member dashboards
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Diagnosing document viewing issues...\n');

  try {
    // Check the specific document from the URL
    const documentId = '3a3d035b-5d3e-4261-8694-b80b42e1f113';
    
    console.log('📄 Checking document:', documentId);
    
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: {
        pages: {
          orderBy: { pageNumber: 'asc' },
          take: 5
        },
        user: {
          select: { email: true, name: true }
        }
      }
    });

    if (!document) {
      console.log('❌ Document not found');
      return;
    }

    console.log(`📋 Document Details:`);
    console.log(`   Title: "${document.title}"`);
    console.log(`   Filename: "${document.filename}"`);
    console.log(`   Content Type: "${document.contentType}"`);
    console.log(`   MIME Type: "${document.mimeType}"`);
    console.log(`   File Size: ${document.fileSize} bytes`);
    console.log(`   Owner: ${document.user.email}`);
    console.log(`   Pages: ${document.pages?.length || 0}`);
    console.log(`   Created: ${document.createdAt}`);

    if (document.pages && document.pages.length > 0) {
      console.log('\n📑 First few pages:');
      for (const page of document.pages.slice(0, 3)) {
        console.log(`   Page ${page.pageNumber}: ${page.pageUrl}`);
        console.log(`     Size: ${page.fileSize} bytes`);
        console.log(`     Expires: ${page.expiresAt}`);
      }
    } else {
      console.log('\n⚠️  NO PAGES FOUND - This is the main issue!');
    }

    // Check if there are any documents with pages for comparison
    console.log('\n🔍 Checking other documents with pages...');
    
    const documentsWithPages = await prisma.document.findMany({
      where: {
        pages: {
          some: {}
        }
      },
      include: {
        pages: {
          take: 1
        },
        user: {
          select: { email: true }
        }
      },
      take: 5
    });

    if (documentsWithPages.length > 0) {
      console.log(`✅ Found ${documentsWithPages.length} documents with pages:`);
      for (const doc of documentsWithPages) {
        console.log(`   - "${doc.title}" (${doc.pages.length} pages) - ${doc.user.email}`);
      }
    } else {
      console.log('❌ NO DOCUMENTS HAVE PAGES - This is a system-wide issue!');
    }

    // Check conversion jobs for this document
    console.log('\n🔄 Checking conversion jobs...');
    
    const conversionJobs = await prisma.conversionJob.findMany({
      where: {
        documentId: documentId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 3
    });

    if (conversionJobs.length > 0) {
      console.log(`📊 Found ${conversionJobs.length} conversion jobs:`);
      for (const job of conversionJobs) {
        console.log(`   - Status: ${job.status}, Progress: ${job.progress}%, Stage: ${job.stage}`);
        console.log(`     Created: ${job.createdAt}`);
        if (job.errorMessage) {
          console.log(`     Error: ${job.errorMessage}`);
        }
      }
    } else {
      console.log('❌ No conversion jobs found - Document was never converted!');
    }

    // Check if document conversion API is working
    console.log('\n🧪 Testing document conversion API...');
    
    try {
      const response = await fetch(`http://localhost:3000/api/documents/${documentId}/pages`);
      console.log(`   API Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`   API returned ${data.pages?.length || 0} pages`);
      } else {
        const errorText = await response.text();
        console.log(`   API Error: ${errorText}`);
      }
    } catch (error) {
      console.log(`   API Test Failed: ${error.message}`);
    }

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    
    if (!document.pages || document.pages.length === 0) {
      console.log('1. 🔧 IMMEDIATE FIX: Convert this document to generate pages');
      console.log('   Run: npx tsx scripts/convert-single-document.ts');
      console.log('');
      console.log('2. 🔍 ROOT CAUSE: Check why document conversion is not working');
      console.log('   - Verify PDF conversion service is running');
      console.log('   - Check Supabase storage configuration');
      console.log('   - Ensure document conversion API is functional');
    }

    if (documentsWithPages.length === 0) {
      console.log('3. 🚨 SYSTEM ISSUE: No documents have pages - conversion system is broken');
      console.log('   - Check document upload and conversion pipeline');
      console.log('   - Verify Supabase storage buckets and policies');
      console.log('   - Test PDF conversion service');
    }

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);