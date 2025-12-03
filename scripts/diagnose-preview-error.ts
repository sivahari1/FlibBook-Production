import { prisma } from '../lib/db';

async function diagnosePreviewError() {
  console.log('🔍 Diagnosing Preview Error...\n');

  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // Test query
    console.log('2. Testing document query...');
    const documents = await prisma.document.findMany({
      take: 1,
      select: {
        id: true,
        filename: true,
        mimeType: true,
      },
    });
    console.log(`✅ Found ${documents.length} document(s)`);
    if (documents.length > 0) {
      console.log(`   Sample: ${documents[0].filename} (${documents[0].id})\n`);
    }

    // Check environment variables
    console.log('3. Checking environment variables...');
    const requiredEnvVars = [
      'DATABASE_URL',
      'DIRECT_URL',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    ];

    for (const envVar of requiredEnvVars) {
      const value = process.env[envVar];
      if (value) {
        console.log(`✅ ${envVar}: ${value.substring(0, 30)}...`);
      } else {
        console.log(`❌ ${envVar}: NOT SET`);
      }
    }

    console.log('\n✅ All diagnostics passed!');
    console.log('\nThe preview error might be caused by:');
    console.log('1. Dev server needs restart');
    console.log('2. Browser cache needs clearing');
    console.log('3. Prisma client needs regeneration (stop dev server first)');

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnosePreviewError();
