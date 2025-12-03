/**
 * Diagnostic script to check preview functionality
 * Run with: npx tsx scripts/diagnose-preview-current.ts
 */

import { prisma } from '../lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function diagnosePreview() {
  console.log('🔍 Diagnosing Preview Functionality\n');

  try {
    // 1. Check if there are any documents
    const documents = await prisma.document.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        filename: true,
        mimeType: true,
        storagePath: true,
        userId: true,
        createdAt: true,
      },
    });

    console.log(`📄 Found ${documents.length} recent documents:`);
    documents.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.title} (${doc.filename})`);
      console.log(`     ID: ${doc.id}`);
      console.log(`     Type: ${doc.mimeType}`);
      console.log(`     Storage: ${doc.storagePath}`);
      console.log(`     Created: ${doc.createdAt.toISOString()}\n`);
    });

    if (documents.length === 0) {
      console.log('❌ No documents found. Please upload a document first.\n');
      return;
    }

    // 2. Check if documents exist in storage
    console.log('\n📦 Checking Supabase Storage:');
    for (const doc of documents.slice(0, 3)) {
      try {
        const { data, error } = await supabase.storage
          .from('documents')
          .list(doc.storagePath.split('/').slice(0, -1).join('/'));

        if (error) {
          console.log(`  ❌ ${doc.title}: Storage error - ${error.message}`);
        } else if (data && data.length > 0) {
          console.log(`  ✅ ${doc.title}: Found in storage`);
        } else {
          console.log(`  ⚠️  ${doc.title}: Not found in storage`);
        }
      } catch (err) {
        console.log(`  ❌ ${doc.title}: ${err}`);
      }
    }

    // 3. Check for converted pages
    console.log('\n🖼️  Checking Converted Pages:');
    for (const doc of documents.slice(0, 3)) {
      try {
        const { data, error } = await supabase.storage
          .from('document-pages')
          .list(`${doc.userId}/${doc.id}`);

        if (error) {
          console.log(`  ❌ ${doc.title}: Error checking pages - ${error.message}`);
        } else if (data && data.length > 0) {
          console.log(`  ✅ ${doc.title}: ${data.length} pages converted`);
        } else {
          console.log(`  ⚠️  ${doc.title}: No converted pages (needs conversion)`);
        }
      } catch (err) {
        console.log(`  ❌ ${doc.title}: ${err}`);
      }
    }

    // 4. Check page cache
    console.log('\n💾 Checking Page Cache:');
    for (const doc of documents.slice(0, 3)) {
      const cacheKey = `pages:${doc.id}`;
      const cached = await prisma.cache.findUnique({
        where: { key: cacheKey },
        select: {
          key: true,
          value: true,
          expiresAt: true,
        },
      });

      if (cached) {
        const isExpired = cached.expiresAt && cached.expiresAt < new Date();
        const pageCount = JSON.parse(cached.value).length;
        console.log(`  ${isExpired ? '⚠️' : '✅'} ${doc.title}: ${pageCount} pages cached ${isExpired ? '(expired)' : ''}`);
      } else {
        console.log(`  ⚠️  ${doc.title}: Not cached`);
      }
    }

    // 5. Test preview URL generation
    console.log('\n🔗 Testing Preview URLs:');
    const testDoc = documents[0];
    if (testDoc) {
      console.log(`  Testing with: ${testDoc.title}`);
      console.log(`  Preview URL: /dashboard/documents/${testDoc.id}/preview`);
      console.log(`  API URL: /api/documents/${testDoc.id}/pages`);
    }

    console.log('\n✅ Diagnostic complete!\n');
    console.log('💡 Next steps:');
    console.log('  1. If documents are missing from storage, re-upload them');
    console.log('  2. If pages are not converted, the preview will trigger automatic conversion');
    console.log('  3. Check browser console for any client-side errors');
    console.log('  4. Check server logs for API errors\n');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePreview();
