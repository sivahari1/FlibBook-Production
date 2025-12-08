import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function diagnosePreview() {
  console.log('🔍 COMPREHENSIVE PREVIEW DIAGNOSTIC\n');
  
  // 1. Check environment variables
  console.log('1️⃣ Environment Variables:');
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'DATABASE_URL'
  ];
  
  for (const envVar of requiredEnvVars) {
    const value = process.env[envVar];
    console.log(`   ${envVar}: ${value ? '✅ Set' : '❌ Missing'}`);
  }
  console.log('');
  
  // 2. Check database connection
  console.log('2️⃣ Database Connection:');
  try {
    const docCount = await prisma.document.count();
    console.log(`   ✅ Connected - ${docCount} documents found\n`);
  } catch (error: any) {
    console.log(`   ❌ Failed: ${error.message}\n`);
    return;
  }
  
  // 3. Check recent documents
  console.log('3️⃣ Recent Documents:');
  const docs = await prisma.document.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      contentType: true,
      fileUrl: true,
      thumbnailUrl: true,
      createdAt: true
    }
  });
  
  for (const doc of docs) {
    console.log(`   📄 ${doc.title}`);
    console.log(`      ID: ${doc.id}`);
    console.log(`      Type: ${doc.contentType}`);
    console.log(`      File URL: ${doc.fileUrl ? '✅' : '❌'}`);
    console.log(`      Thumbnail: ${doc.thumbnailUrl ? '✅' : '❌'}`);
    console.log('');
  }
  
  // 4. Check DocumentPages table
  console.log('4️⃣ DocumentPages Table:');
  try {
    const pageCount = await prisma.documentPage.count();
    console.log(`   ✅ Table exists - ${pageCount} pages found`);
    
    if (pageCount > 0) {
      const samplePage = await prisma.documentPage.findFirst({
        include: { document: { select: { title: true } } }
      });
      console.log(`   Sample page from: ${samplePage?.document.title}`);
      console.log(`   Page number: ${samplePage?.pageNumber}`);
      console.log(`   Image URL: ${samplePage?.imageUrl ? '✅' : '❌'}`);
    }
  } catch (error: any) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  console.log('');
  
  // 5. Check Supabase storage
  console.log('5️⃣ Supabase Storage:');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (supabaseUrl && supabaseKey) {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.log(`   ❌ Error listing buckets: ${error.message}`);
      } else {
        console.log(`   ✅ Connected - ${buckets?.length || 0} buckets found`);
        for (const bucket of buckets || []) {
          console.log(`      - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
        }
        
        // Check document-pages bucket specifically
        const { data: files } = await supabase.storage
          .from('document-pages')
          .list('', { limit: 5 });
        
        console.log(`   document-pages bucket: ${files?.length || 0} files`);
      }
    } catch (error: any) {
      console.log(`   ❌ Storage error: ${error.message}`);
    }
  } else {
    console.log('   ❌ Supabase credentials missing');
  }
  console.log('');
  
  // 6. Test a specific document
  console.log('6️⃣ Testing Specific Document:');
  const testDoc = docs[0];
  if (testDoc) {
    console.log(`   Testing: ${testDoc.title}`);
    
    // Check if it has pages
    const pages = await prisma.documentPage.findMany({
      where: { documentId: testDoc.id },
      orderBy: { pageNumber: 'asc' },
      take: 3
    });
    
    console.log(`   Pages in DB: ${pages.length}`);
    for (const page of pages) {
      console.log(`      Page ${page.pageNumber}: ${page.imageUrl ? '✅ Has URL' : '❌ No URL'}`);
      
      // Try to fetch the URL
      if (page.imageUrl) {
        try {
          const response = await fetch(page.imageUrl, { method: 'HEAD' });
          console.log(`         HTTP ${response.status} ${response.statusText}`);
        } catch (error: any) {
          console.log(`         ❌ Fetch failed: ${error.message}`);
        }
      }
    }
  }
  console.log('');
  
  // 7. Recommendations
  console.log('7️⃣ RECOMMENDATIONS:');
  console.log('');
  
  const issues: string[] = [];
  
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    issues.push('Set NEXT_PUBLIC_SUPABASE_URL in .env');
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    issues.push('Set SUPABASE_SERVICE_ROLE_KEY in .env');
  }
  
  const pageCount = await prisma.documentPage.count();
  if (pageCount === 0 && docs.length > 0) {
    issues.push('Documents exist but no pages - run conversion script');
  }
  
  if (issues.length === 0) {
    console.log('   ✅ No obvious issues found!');
    console.log('   The problem might be:');
    console.log('   - Browser cache (try hard refresh: Ctrl+Shift+R)');
    console.log('   - CORS configuration in Supabase');
    console.log('   - RLS policies blocking access');
  } else {
    console.log('   ❌ Issues found:');
    issues.forEach((issue, i) => {
      console.log(`   ${i + 1}. ${issue}`);
    });
  }
  
  await prisma.$disconnect();
}

diagnosePreview().catch(console.error);
