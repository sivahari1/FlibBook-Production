#!/usr/bin/env tsx

/**
 * Test signed URL API directly
 */

import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/db';

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

async function testSignedUrlDirect() {
  console.log('🧪 Testing signed URL generation directly...\n');

  try {
    // Find a document
    const memberItem = await prisma.myJstudyroomItem.findFirst({
      include: {
        bookShopItem: {
          include: {
            document: true
          }
        }
      }
    });

    if (!memberItem) {
      console.log('❌ No member items found');
      return;
    }

    const document = memberItem.bookShopItem.document;
    console.log(`📄 Testing document: ${document.title}`);
    console.log(`   - Storage Path: ${document.storagePath}`);

    // Test direct Supabase signed URL generation
    const { data, error } = await supabase.storage
      .from('documents')
      .createSignedUrl(document.storagePath, 3600);

    if (error) {
      console.log(`❌ Supabase Error: ${error.message}`);
      return;
    }

    console.log(`✅ Signed URL generated successfully`);
    console.log(`📎 URL: ${data.signedUrl}`);

    // Test if the URL is accessible
    try {
      const response = await fetch(data.signedUrl, { method: 'HEAD' });
      console.log(`📡 URL Response: ${response.status} ${response.statusText}`);
      
      if (response.ok) {
        console.log(`✅ Document is accessible via signed URL`);
      } else {
        console.log(`❌ Document not accessible: ${response.status}`);
      }
    } catch (fetchError) {
      console.log(`❌ Fetch Error: ${fetchError}`);
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run test
testSignedUrlDirect()
  .then(() => {
    console.log('\n✅ Signed URL test complete');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });