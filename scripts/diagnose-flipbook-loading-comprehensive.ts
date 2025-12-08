import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

async function comprehensiveDiagnosis() {
  console.log('🔍 COMPREHENSIVE FLIPBOOK LOADING DIAGNOSIS\n');
  console.log('=' .repeat(60));

  // 1. Check Environment Variables
  console.log('\n1️⃣ ENVIRONMENT VARIABLES CHECK');
  console.log('-'.repeat(60));
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];

  const envStatus: Record<string, boolean> = {};
  requiredEnvVars.forEach((varName) => {
    const exists = !!process.env[varName];
    envStatus[varName] = exists;
    console.log(`${exists ? '✅' : '❌'} ${varName}: ${exists ? 'SET' : 'MISSING'}`);
  });

  if (!Object.values(envStatus).every(Boolean)) {
    console.log('\n⚠️  Missing environment variables detected!');
    return;
  }

  // 2. Initialize Supabase Client
  console.log('\n2️⃣ SUPABASE CONNECTION CHECK');
  console.log('-'.repeat(60));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      console.log('❌ Supabase connection failed:', error.message);
      return;
    }
    console.log('✅ Supabase connection successful');
    console.log(`   Found ${data.length} storage buckets`);
  } catch (error) {
    console.log('❌ Supabase connection error:', error);
    return;
  }

  // 3. Check Storage Bucket
  console.log('\n3️⃣ STORAGE BUCKET CHECK');
  console.log('-'.repeat(60));
  
  const bucketName = 'document-pages';
  const { data: bucketData, error: bucketError } = await supabase.storage.getBucket(bucketName);
  
  if (bucketError) {
    console.log(`❌ Bucket '${bucketName}' not found:`, bucketError.message);
    console.log('   Creating bucket...');
    
    const { error: createError } = await supabase.storage.createBucket(bucketName, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    });
    
    if (createError) {
      console.log('❌ Failed to create bucket:', createError.message);
    } else {
      console.log('✅ Bucket created successfully');
    }
  } else {
    console.log(`✅ Bucket '${bucketName}' exists`);
    console.log(`   Public: ${bucketData.public}`);
    console.log(`   File size limit: ${bucketData.file_size_limit || 'unlimited'}`);
  }

  // 4. Check CORS Configuration
  console.log('\n4️⃣ CORS CONFIGURATION CHECK');
  console.log('-'.repeat(60));
  console.log('⚠️  CORS must be configured in Supabase Dashboard:');
  console.log('   1. Go to Storage > Configuration');
  console.log('   2. Add CORS policy for your domain');
  console.log('   3. Allow GET, HEAD methods');
  console.log('   4. Allow Origin: http://localhost:3000 (dev)');

  // 5. Check Database - Document Pages
  console.log('\n5️⃣ DATABASE CHECK - DOCUMENT PAGES');
  console.log('-'.repeat(60));
  
  try {
    const documents = await prisma.document.findMany({
      where: {
        contentType: 'application/pdf',
      },
      include: {
        pages: true,
      },
      take: 5,
    });

    console.log(`✅ Found ${documents.length} PDF documents`);
    
    for (const doc of documents) {
      console.log(`\n   Document: ${doc.title} (ID: ${doc.id})`);
      console.log(`   Pages in DB: ${doc.pages.length}`);
      console.log(`   Converted: ${doc.isConverted ? 'Yes' : 'No'}`);
      
      if (doc.pages.length > 0) {
        const samplePage = doc.pages[0];
        console.log(`   Sample page URL: ${samplePage.imageUrl?.substring(0, 80)}...`);
        
        // Test if URL is accessible
        if (samplePage.imageUrl) {
          try {
            const response = await fetch(samplePage.imageUrl, { method: 'HEAD' });
            console.log(`   URL Status: ${response.status} ${response.statusText}`);
            
            if (response.status === 200) {
              console.log('   ✅ Image URL is accessible');
            } else if (response.status === 401) {
              console.log('   ❌ Authentication required (401)');
            } else if (response.status === 403) {
              console.log('   ❌ Access forbidden (403) - Check RLS policies');
            } else if (response.status === 404) {
              console.log('   ❌ Image not found (404)');
            }
          } catch (fetchError: any) {
            console.log(`   ❌ Failed to fetch URL: ${fetchError.message}`);
          }
        }
      } else {
        console.log('   ⚠️  No pages found - document needs conversion');
      }
    }
  } catch (dbError) {
    console.log('❌ Database query failed:', dbError);
  }

  // 6. Check RLS Policies
  console.log('\n6️⃣ RLS POLICIES CHECK');
  console.log('-'.repeat(60));
  console.log('⚠️  Checking if RLS policies exist...');
  
  try {
    const { data: policies, error: policyError } = await supabase
      .from('DocumentPage')
      .select('*')
      .limit(1);
    
    if (policyError) {
      if (policyError.message.includes('policy')) {
        console.log('❌ RLS policy blocking access');
        console.log('   Solution: Update RLS policies to allow authenticated users');
      } else {
        console.log('❌ Query error:', policyError.message);
      }
    } else {
      console.log('✅ RLS policies allow access');
    }
  } catch (error) {
    console.log('⚠️  Could not check RLS policies');
  }

  // 7. Test Signed URL Generation
  console.log('\n7️⃣ SIGNED URL GENERATION TEST');
  console.log('-'.repeat(60));
  
  try {
    const documents = await prisma.document.findFirst({
      where: {
        contentType: 'application/pdf',
        isConverted: true,
      },
      include: {
        pages: {
          take: 1,
        },
      },
    });

    if (documents && documents.pages.length > 0) {
      const page = documents.pages[0];
      const storagePath = page.imageUrl?.split('/').slice(-2).join('/');
      
      if (storagePath) {
        console.log(`   Testing path: ${storagePath}`);
        
        const { data: signedData, error: signedError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(storagePath, 3600);
        
        if (signedError) {
          console.log('❌ Failed to create signed URL:', signedError.message);
        } else {
          console.log('✅ Signed URL created successfully');
          console.log(`   URL: ${signedData.signedUrl.substring(0, 80)}...`);
          
          // Test the signed URL
          try {
            const response = await fetch(signedData.signedUrl, { method: 'HEAD' });
            console.log(`   Signed URL Status: ${response.status} ${response.statusText}`);
          } catch (error) {
            console.log('❌ Failed to fetch signed URL');
          }
        }
      }
    } else {
      console.log('⚠️  No converted documents found to test');
    }
  } catch (error) {
    console.log('❌ Signed URL test failed:', error);
  }

  // 8. Check API Route
  console.log('\n8️⃣ API ROUTE CHECK');
  console.log('-'.repeat(60));
  
  try {
    const doc = await prisma.document.findFirst({
      where: {
        contentType: 'application/pdf',
        isConverted: true,
      },
    });

    if (doc) {
      console.log(`   Testing API: /api/documents/${doc.id}/pages`);
      console.log('   ⚠️  Test this URL in your browser while logged in');
    } else {
      console.log('   ⚠️  No converted documents to test');
    }
  } catch (error) {
    console.log('❌ API route check failed');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 DIAGNOSIS SUMMARY');
  console.log('='.repeat(60));
  console.log('\nCommon Issues & Solutions:');
  console.log('1. 401 Unauthorized → Check authentication in browser');
  console.log('2. 403 Forbidden → Update RLS policies');
  console.log('3. 404 Not Found → Run document conversion');
  console.log('4. CORS Error → Configure CORS in Supabase');
  console.log('5. No pages → Convert PDFs using conversion script');
  
  console.log('\n✅ Diagnosis complete!\n');
}

comprehensiveDiagnosis()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
