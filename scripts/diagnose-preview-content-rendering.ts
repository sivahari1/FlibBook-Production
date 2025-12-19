import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function diagnose() {
  console.log('🔍 Diagnosing Preview Content Rendering Issues\n');

  try {
    // 1. Check if NextAuth API route exists
    console.log('1️⃣ Checking NextAuth API Route...');
    import fs from 'fs';
    const nextAuthPath = 'app/api/auth/[...nextauth]/route.ts';
    if (fs.existsSync(nextAuthPath)) {
      console.log('✅ NextAuth API route exists');
    } else {
      console.log('❌ NextAuth API route NOT found');
    }

    // 2. Check if DocumentPage model exists in database
    console.log('\n2️⃣ Checking DocumentPage table...');
    try {
      const pageCount = await prisma.$queryRaw`SELECT COUNT(*) FROM "document_pages"`;
      console.log('✅ DocumentPage table exists');
      console.log(`   Pages in database: ${pageCount}`);
    } catch (error) {
      console.log('❌ DocumentPage table does NOT exist');
      console.log('   Error:', error.message);
    }

    // 3. Check Supabase Storage bucket
    console.log('\n3️⃣ Checking Supabase Storage...');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.log('❌ Supabase credentials not configured');
    } else {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.log('❌ Error accessing Supabase Storage:', error.message);
      } else {
        const docPagesBucket = buckets?.find(b => b.name === 'document-pages');
        if (docPagesBucket) {
          console.log('✅ "document-pages" bucket exists');
        } else {
          console.log('❌ "document-pages" bucket NOT found');
          console.log('   Available buckets:', buckets?.map(b => b.name).join(', '));
        }
      }
    }

    // 4. Check if pdf-converter service exists
    console.log('\n4️⃣ Checking PDF Converter Service...');
    if (fs.existsSync('lib/services/pdf-converter.ts')) {
      console.log('✅ PDF converter service exists');
    } else {
      console.log('❌ PDF converter service NOT found');
    }

    // 5. Check if page-cache service exists
    console.log('\n5️⃣ Checking Page Cache Service...');
    if (fs.existsSync('lib/services/page-cache.ts')) {
      console.log('✅ Page cache service exists');
    } else {
      console.log('❌ Page cache service NOT found');
    }

    // 6. Check sample document for pages
    console.log('\n6️⃣ Checking Sample Documents...');
    const documents = await prisma.document.findMany({
      take: 5,
      where: {
        contentType: 'PDF'
      },
      select: {
        id: true,
        title: true,
        contentType: true,
      }
    });

    if (documents.length === 0) {
      console.log('⚠️  No PDF documents found in database');
    } else {
      console.log(`✅ Found ${documents.length} PDF documents`);
      for (const doc of documents) {
        console.log(`   - ${doc.title} (${doc.id})`);
      }
    }

    console.log('\n✅ Diagnosis complete!');
    
  } catch (error) {
    console.error('\n❌ Diagnosis failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnose();
