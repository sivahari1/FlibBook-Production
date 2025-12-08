/**
 * Reconvert a single document by ID
 * 
 * Usage: npm run reconvert-single -- <documentId>
 */

import { prisma } from '@/lib/db';
import { convertPdfToImages } from '@/lib/services/pdf-converter';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import os from 'os';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function reconvertDocument(documentId: string) {
  console.log(`\n🔄 Reconverting document: ${documentId}\n`);

  try {
    // Get document from database
    const document = await prisma.document.findUnique({
      where: { id: documentId },
      include: { pages: true }
    });

    if (!document) {
      console.error(`❌ Document not found: ${documentId}`);
      process.exit(1);
    }

    console.log(`📄 Document: ${document.filename}`);
    console.log(`   User ID: ${document.userId}`);
    console.log(`   Current pages: ${document.pages.length}\n`);

    // Download PDF from Supabase
    console.log(`📥 Downloading PDF from storage...`);
    const { data: pdfData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(`${document.userId}/${document.id}/${document.filename}`);

    if (downloadError || !pdfData) {
      console.error(`❌ Failed to download PDF:`, downloadError);
      process.exit(1);
    }

    // Save to temp file
    const tempDir = path.join(os.tmpdir(), `reconvert-${documentId}`);
    fs.mkdirSync(tempDir, { recursive: true });
    const tempPdfPath = path.join(tempDir, document.filename);
    
    const buffer = Buffer.from(await pdfData.arrayBuffer());
    fs.writeFileSync(tempPdfPath, buffer);
    
    console.log(`✅ PDF downloaded (${(buffer.length / 1024).toFixed(2)} KB)\n`);

    // Delete old pages from storage
    console.log(`🗑️  Deleting old page images...`);
    const storagePath = `${document.userId}/${document.id}`;
    const { data: files } = await supabase.storage
      .from('document-pages')
      .list(storagePath);

    if (files && files.length > 0) {
      const filePaths = files.map(f => `${storagePath}/${f.name}`);
      await supabase.storage
        .from('document-pages')
        .remove(filePaths);
      console.log(`✅ Deleted ${files.length} old page images\n`);
    }

    // Delete old page records from database
    await prisma.documentPage.deleteMany({
      where: { documentId: document.id }
    });
    console.log(`✅ Deleted old page records from database\n`);

    // Convert PDF with fixed code
    console.log(`🔄 Converting PDF with fixed converter...\n`);
    const pageUrls = await convertPdfToImages(
      tempPdfPath,
      document.userId,
      document.id
    );

    console.log(`\n✅ Conversion complete!`);
    console.log(`   Pages generated: ${pageUrls.length}\n`);

    // Create new page records
    for (let i = 0; i < pageUrls.length; i++) {
      await prisma.documentPage.create({
        data: {
          documentId: document.id,
          pageNumber: i + 1,
          url: pageUrls[i],
        },
      });
    }

    console.log(`✅ Created ${pageUrls.length} new page records\n`);

    // Cleanup
    fs.rmSync(tempDir, { recursive: true, force: true });

    // Verify the conversion
    console.log(`\n🔍 Verifying conversion...\n`);
    const { data: verifyFiles } = await supabase.storage
      .from('document-pages')
      .list(storagePath);

    if (verifyFiles) {
      const pageFiles = verifyFiles.filter(f => 
        f.name.startsWith('page-') && 
        (f.name.endsWith('.jpg') || f.name.endsWith('.jpeg'))
      );

      let suspiciousCount = 0;
      for (const file of pageFiles) {
        const size = file.metadata?.size || 0;
        const sizeKB = (size / 1024).toFixed(2);
        
        if (size < 10000) {
          console.log(`⚠️  ${file.name}: ${sizeKB} KB (SUSPICIOUS)`);
          suspiciousCount++;
        } else {
          console.log(`✅ ${file.name}: ${sizeKB} KB`);
        }
      }

      console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      if (suspiciousCount === 0) {
        console.log(`\n🎉 SUCCESS! All pages converted successfully!`);
        console.log(`   No blank pages detected.\n`);
      } else {
        console.log(`\n⚠️  WARNING: ${suspiciousCount} pages are still suspicious.`);
        console.log(`   The fix may not have worked correctly.\n`);
      }
    }

  } catch (error) {
    console.error(`\n❌ Error:`, error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Get document ID from command line
const documentId = process.argv[2];

if (!documentId) {
  console.error(`\n❌ Usage: npm run reconvert-single -- <documentId>\n`);
  process.exit(1);
}

reconvertDocument(documentId);
