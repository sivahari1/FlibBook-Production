import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function check() {
  console.log('\n=== Preview Status Check ===\n');

  console.log('Environment Variables:');
  console.log(`  SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET' : 'MISSING'}`);
  console.log(`  SUPABASE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET' : 'MISSING'}`);
  console.log(`  DATABASE_URL: ${process.env.DATABASE_URL ? 'SET' : 'MISSING'}\n`);

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.DATABASE_URL) {
    console.log('ERROR: Missing required environment variables\n');
    return;
  }

  const { prisma } = await import('../lib/db');
  const { createClient } = await import('@supabase/supabase-js');

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const docCount = await prisma.document.count();
    console.log(`Database: Connected - ${docCount} documents found\n`);

    if (docCount === 0) {
      console.log('No documents found. Upload a document first.\n');
      return;
    }

    const doc = await prisma.document.findFirst({
      where: { mimeType: 'application/pdf' },
      orderBy: { createdAt: 'desc' },
    });

    if (!doc) {
      console.log('No PDF documents found.\n');
      return;
    }

    console.log(`Sample Document: ${doc.title}`);
    console.log(`  ID: ${doc.id}`);
    console.log(`  Path: ${doc.storagePath}\n`);

    const { data: pages, error } = await supabase.storage
      .from('document-pages')
      .list(`${doc.userId}/${doc.id}`);

    if (error) {
      console.log(`Pages Check: ERROR - ${error.message}`);
    } else if (pages && pages.length > 0) {
      console.log(`Pages Check: ${pages.length} pages found`);
    } else {
      console.log(`Pages Check: No pages (will auto-convert on preview)`);
    }

    console.log(`\nTest Preview: http://localhost:3000/dashboard/documents/${doc.id}/preview\n`);

  } catch (error) {
    console.error('ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check().catch(console.error);
