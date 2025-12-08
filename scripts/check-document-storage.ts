import { prisma } from '@/lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const docId = process.argv[2] || '164fbf91-9471-4d88-96a0-2dfc6611a282';

async function checkDocument() {
  const doc = await prisma.document.findUnique({
    where: { id: docId },
    select: {
      id: true,
      filename: true,
      storagePath: true,
      userId: true,
      mimeType: true,
    },
  });

  console.log('Document:', JSON.stringify(doc, null, 2));

  if (doc) {
    // Check if file exists in documents bucket
    const paths = [
      `${doc.userId}/${doc.id}/${doc.filename}`,
      `${doc.userId}/${doc.filename}`,
      `${doc.id}/${doc.filename}`,
      doc.storagePath,
    ];

    console.log('\nChecking storage paths:');
    for (const path of paths) {
      if (!path) continue;
      const { data, error } = await supabase.storage
        .from('documents')
        .list(path.split('/').slice(0, -1).join('/'));
      
      console.log(`  ${path}: ${error ? 'NOT FOUND' : 'EXISTS'}`);
    }
  }

  await prisma.$disconnect();
}

checkDocument();
