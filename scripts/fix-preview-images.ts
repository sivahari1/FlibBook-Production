import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function fixPreviewImages() {
  try {
    console.log('🔍 Checking document and storage...\n');

    const doc = await prisma.document.findFirst({
      where: { id: '164fbf91-9471-4d88-96a0-2dfc6611a282' },
      include: { pages: true }
    });

    if (!doc) {
      console.log('❌ Document not found');
      return;
    }

    console.log(`📄 Document: ${doc.title}`);
    console.log(`   Pages in DB: ${doc.pages.length}`);
    console.log(`   Status: ${doc.status || 'undefined'}`);

    // Check if images exist in storage
    console.log('\n🗄️  Checking Supabase storage...');
    
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('❌ Error listing buckets:', bucketError);
      return;
    }

    console.log(`   Buckets: ${buckets?.map(b => b.name).join(', ')}`);

    // Check document-pages bucket
    const { data: files, error: filesError } = await supabase.storage
      .from('document-pages')
      .list(doc.id);

    if (filesError) {
      console.error('❌ Error listing files:', filesError);
    } else {
      console.log(`   Files in document-pages/${doc.id}: ${files?.length || 0}`);
      if (files && files.length > 0) {
        files.forEach(file => console.log(`      - ${file.name}`));
      }
    }

    // Decision
    if (!doc.pages[0]?.imageUrl || doc.status !== 'CONVERTED') {
      console.log('\n⚠️  Document has no valid images. Options:');
      console.log('   1. Upload a new PDF document through the UI');
      console.log('   2. Delete this broken document');
      console.log('\n💡 Deleting broken document...');

      await prisma.documentPage.deleteMany({
        where: { documentId: doc.id }
      });

      await prisma.document.delete({
        where: { id: doc.id }
      });

      console.log('✅ Broken document deleted. Please upload a new PDF.');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPreviewImages();
