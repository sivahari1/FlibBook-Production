#!/usr/bin/env tsx

/**
 * Diagnose CORS issues in member document viewing
 */

import { prisma } from '../lib/db';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function diagnoseCORSIssue() {
  console.log('🔍 Diagnosing CORS issues in member document viewing...\n');

  try {
    // 1. Check if we have any member documents
    const memberItems = await prisma.myJstudyroomItem.findMany({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        }
      },
      take: 5
    });

    console.log(`📚 Found ${memberItems.length} member documents`);

    if (memberItems.length === 0) {
      console.log('❌ No member documents found. Creating test data...');
      return;
    }

    // 2. Test document access for each item
    for (const item of memberItems) {
      const document = item.bookShopItem.document;
      console.log(`\n📄 Testing document: ${document.title}`);
      console.log(`   - ID: ${document.id}`);
      console.log(`   - Content Type: ${document.contentType}`);
      console.log(`   - Storage Path: ${document.storagePath}`);
      console.log(`   - MIME Type: ${document.mimeType}`);

      // Test Supabase signed URL generation
      if (document.storagePath) {
        try {
          const { data, error } = await supabase.storage
            .from('documents')
            .createSignedUrl(document.storagePath, 3600);

          if (error) {
            console.log(`   ❌ Signed URL Error: ${error.message}`);
          } else {
            console.log(`   ✅ Signed URL generated successfully`);
            console.log(`   📎 URL: ${data.signedUrl.substring(0, 100)}...`);
            
            // Test if URL is accessible
            try {
              const response = await fetch(data.signedUrl, { method: 'HEAD' });
              console.log(`   📡 URL Response: ${response.status} ${response.statusText}`);
              
              // Check CORS headers
              const corsHeaders = {
                'Access-Control-Allow-Origin': response.headers.get('Access-Control-Allow-Origin'),
                'Access-Control-Allow-Methods': response.headers.get('Access-Control-Allow-Methods'),
                'Access-Control-Allow-Headers': response.headers.get('Access-Control-Allow-Headers'),
              };
              
              console.log(`   🔒 CORS Headers:`, corsHeaders);
            } catch (fetchError) {
              console.log(`   ❌ URL Fetch Error: ${fetchError}`);
            }
          }
        } catch (supabaseError) {
          console.log(`   ❌ Supabase Error: ${supabaseError}`);
        }
      }
    }

    // 3. Check Supabase storage configuration
    console.log('\n🔧 Checking Supabase storage configuration...');
    
    try {
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
      
      if (bucketsError) {
        console.log(`❌ Buckets Error: ${bucketsError.message}`);
      } else {
        console.log(`✅ Found ${buckets.length} storage buckets:`);
        buckets.forEach(bucket => {
          console.log(`   - ${bucket.name} (${bucket.public ? 'public' : 'private'})`);
        });
      }
    } catch (storageError) {
      console.log(`❌ Storage Error: ${storageError}`);
    }

    // 4. Check environment variables
    console.log('\n🌍 Environment Variables:');
    console.log(`   - NEXT_PUBLIC_SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - SUPABASE_SERVICE_ROLE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Missing'}`);
    console.log(`   - NODE_ENV: ${process.env.NODE_ENV}`);

  } catch (error) {
    console.error('❌ Diagnosis failed:', error);
  }
}

// Run diagnosis
diagnoseCORSIssue()
  .then(() => {
    console.log('\n✅ CORS diagnosis complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Diagnosis failed:', error);
    process.exit(1);
  });