/**
 * PDF Conversion Verification Script
 * 
 * Verifies that PDF pages have been converted correctly and are not blank.
 * 
 * Usage:
 *   npm run verify-pdf -- <documentId>
 * 
 * Example:
 *   npm run verify-pdf -- abc123-def456-ghi789
 * 
 * What it checks:
 * - Lists all converted page images for a document
 * - Shows file size for each page (should be > 50 KB)
 * - Flags suspiciously small pages (< 10 KB) that may be blank
 * - Provides public URLs for manual inspection
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5
 */

import { createClient } from '@supabase/supabase-js';
import { prisma } from '@/lib/db';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface PageFile {
  name: string;
  size: number;
  url: string;
}

async function verifyPdfConversion(documentId: string) {
  console.log(`\n🔍 Verifying PDF conversion for document: ${documentId}\n`);
  
  try {
    // Get document info from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      select: {
        id: true,
        userId: true,
        filename: true,
        mimeType: true,
        createdAt: true,
      },
    });
    
    if (!document) {
      console.error('❌ Document not found in database');
      console.error('   Please check the document ID and try again');
      process.exit(1);
    }
    
    console.log('📄 Document Information:');
    console.log(`   Filename: ${document.filename}`);
    console.log(`   MIME Type: ${document.mimeType}`);
    console.log(`   Created: ${document.createdAt.toISOString()}`);
    console.log(`   User ID: ${document.userId}\n`);
    
    // Check if it's a PDF
    if (document.mimeType !== 'application/pdf') {
      console.warn('⚠️  WARNING: This document is not a PDF');
      console.warn(`   MIME Type: ${document.mimeType}`);
      console.warn('   This script is designed for PDF documents only\n');
    }
    
    // List all pages in Supabase storage
    const storagePath = `${document.userId}/${documentId}`;
    const { data: files, error } = await supabase.storage
      .from('document-pages')
      .list(storagePath);
    
    if (error) {
      console.error('❌ Failed to list pages from storage:', error.message);
      console.error('   Check Supabase credentials and bucket configuration');
      process.exit(1);
    }
    
    if (!files || files.length === 0) {
      console.error('❌ No page files found in storage');
      console.error(`   Storage path: ${storagePath}`);
      console.error('   This document may not have been converted yet');
      console.error('\n💡 Tip: Upload the PDF again to trigger conversion');
      process.exit(1);
    }
    
    console.log(`📊 Found ${files.length} files in storage\n`);
    
    // Filter and sort page files
    const pageFiles: PageFile[] = files
      .filter(f => f.name.startsWith('page-') && (f.name.endsWith('.jpg') || f.name.endsWith('.jpeg') || f.name.endsWith('.png')))
      .map(f => {
        const { data: urlData } = supabase.storage
          .from('document-pages')
          .getPublicUrl(`${storagePath}/${f.name}`);
        
        return {
          name: f.name,
          size: f.metadata?.size || 0,
          url: urlData.publicUrl,
        };
      })
      .sort((a, b) => {
        // Sort by page number
        const aNum = parseInt(a.name.match(/page-(\d+)/)?.[1] || '0');
        const bNum = parseInt(b.name.match(/page-(\d+)/)?.[1] || '0');
        return aNum - bNum;
      });
    
    if (pageFiles.length === 0) {
      console.error('❌ No page image files found');
      console.error('   Found files but none match the expected pattern (page-N.jpg)');
      process.exit(1);
    }
    
    console.log(`📄 Page Files (${pageFiles.length} pages):\n`);
    
    // Analyze each page
    let totalSize = 0;
    let suspiciousCount = 0;
    const suspiciousPages: PageFile[] = [];
    
    for (const file of pageFiles) {
      const sizeKB = file.size / 1024;
      totalSize += sizeKB;
      
      const isSuspicious = sizeKB < 10;
      if (isSuspicious) {
        suspiciousCount++;
        suspiciousPages.push(file);
      }
      
      const status = isSuspicious ? '⚠️  SUSPICIOUS' : '✅';
      const sizeColor = isSuspicious ? '' : '';
      
      console.log(`${status} ${file.name}: ${sizeKB.toFixed(2)} KB`);
      console.log(`   URL: ${file.url}`);
      
      if (isSuspicious) {
        console.log(`   ⚠️  This page is suspiciously small and may be blank!`);
      }
      
      console.log('');
    }
    
    // Summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📈 Summary:\n');
    console.log(`   Total pages: ${pageFiles.length}`);
    console.log(`   Total size: ${totalSize.toFixed(2)} KB`);
    console.log(`   Average size: ${(totalSize / pageFiles.length).toFixed(2)} KB`);
    console.log(`   Suspicious pages (< 10 KB): ${suspiciousCount}`);
    console.log('');
    
    // Recommendations
    if (suspiciousCount > 0) {
      console.log('⚠️  WARNING: Some pages are suspiciously small and may be blank!\n');
      console.log('📋 Suspicious Pages:');
      for (const page of suspiciousPages) {
        console.log(`   - ${page.name}: ${(page.size / 1024).toFixed(2)} KB`);
      }
      console.log('');
      console.log('🔧 Recommended Actions:');
      console.log('   1. Open the URLs above in a browser to visually inspect');
      console.log('   2. Check if pages are blank white or contain actual content');
      console.log('   3. If blank, see troubleshooting guide:');
      console.log('      .kiro/specs/pdf-blank-pages-fix/TROUBLESHOOTING.md');
      console.log('   4. Consider reconverting the document');
      console.log('');
      process.exit(1);
    } else {
      console.log('✅ All pages appear to have reasonable file sizes\n');
      console.log('💡 Next Steps:');
      console.log('   1. Visually inspect a few pages to confirm content is visible');
      console.log('   2. Test the flipbook viewer to ensure pages display correctly');
      console.log('   3. If issues persist, see troubleshooting guide:');
      console.log('      .kiro/specs/pdf-blank-pages-fix/TROUBLESHOOTING.md');
      console.log('');
    }
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    if (error instanceof Error) {
      console.error(`   ${error.message}`);
    }
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Main execution
const documentId = process.argv[2];

if (!documentId) {
  console.error('❌ Error: Document ID is required\n');
  console.log('Usage: npm run verify-pdf -- <documentId>\n');
  console.log('Example:');
  console.log('  npm run verify-pdf -- abc123-def456-ghi789\n');
  console.log('To find document IDs:');
  console.log('  1. Check the database (documents table)');
  console.log('  2. Look at the URL when viewing a document');
  console.log('  3. Check the API response when uploading\n');
  process.exit(1);
}

// Validate document ID format (basic check)
if (documentId.length < 10) {
  console.error('❌ Error: Document ID appears to be invalid\n');
  console.error(`   Provided: ${documentId}`);
  console.error('   Expected: A longer UUID-like string\n');
  process.exit(1);
}

// Run verification
verifyPdfConversion(documentId).catch((error) => {
  console.error('\n❌ Unexpected error:', error);
  process.exit(1);
});
