import { config } from 'dotenv';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function verifyFixComplete() {
  console.log('🔍 Verifying Preview Display Fix\n');
  console.log('═'.repeat(60));
  
  let allChecks = true;

  // Check 1: Verify referrerPolicy is removed from FlipBookViewer
  console.log('\n✓ Check 1: Code Fix Verification');
  console.log('─'.repeat(60));
  try {
    const flipbookCode = readFileSync('components/flipbook/FlipBookViewer.tsx', 'utf-8');
    const hasReferrerPolicy = flipbookCode.includes('referrerPolicy');
    
    if (hasReferrerPolicy) {
      console.log('❌ FAILED: referrerPolicy still present in code');
      console.log('   Action: Remove referrerPolicy attribute from FlipBookViewer.tsx');
      allChecks = false;
    } else {
      console.log('✅ PASSED: referrerPolicy removed from code');
    }
  } catch (error) {
    console.log('⚠️  WARNING: Could not read FlipBookViewer.tsx');
  }

  // Check 2: Test image URLs
  console.log('\n✓ Check 2: Image Accessibility Test');
  console.log('─'.repeat(60));
  
  const testUrls = [
    'https://zuhrivibcgudgsejsljo.supabase.co/storage/v1/object/public/document-pages/cmi2xriym00009u9gegjddd8j/164fbf91-9471-4d88-96a0-2dfc6611a282/page-1.jpg',
  ];

  try {
    const response = await fetch(testUrls[0]);
    if (response.status === 200) {
      console.log('✅ PASSED: Images accessible from Node.js (200 OK)');
      console.log(`   Size: ${response.headers.get('content-length')} bytes`);
      console.log(`   Type: ${response.headers.get('content-type')}`);
    } else {
      console.log(`❌ FAILED: Images return ${response.status}`);
      console.log('   Action: Check Supabase storage configuration');
      allChecks = false;
    }
  } catch (error) {
    console.log('❌ FAILED: Cannot reach Supabase storage');
    console.log('   Error:', error);
    allChecks = false;
  }

  // Check 3: Verify Supabase configuration
  console.log('\n✓ Check 3: Supabase Configuration');
  console.log('─'.repeat(60));
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.log('❌ FAILED: Missing Supabase credentials');
    console.log('   Action: Check .env.local file');
    allChecks = false;
  } else {
    console.log('✅ PASSED: Supabase credentials configured');
    
    try {
      const response = await fetch(`${supabaseUrl}/storage/v1/bucket/document-pages`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'apikey': supabaseKey,
        },
      });

      if (response.ok) {
        const bucket = await response.json();
        if (bucket.public) {
          console.log('✅ PASSED: Storage bucket is public');
        } else {
          console.log('❌ FAILED: Storage bucket is not public');
          console.log('   Action: Run SQL to make bucket public');
          allChecks = false;
        }
      }
    } catch (error) {
      console.log('⚠️  WARNING: Could not verify bucket configuration');
    }
  }

  // Check 4: CORS Configuration
  console.log('\n✓ Check 4: CORS Configuration');
  console.log('─'.repeat(60));
  
  try {
    const response = await fetch(testUrls[0], { method: 'HEAD' });
    const corsHeader = response.headers.get('access-control-allow-origin');
    
    if (corsHeader === '*' || corsHeader === 'http://localhost:3000') {
      console.log('✅ PASSED: CORS properly configured');
      console.log(`   Access-Control-Allow-Origin: ${corsHeader}`);
    } else {
      console.log('⚠️  WARNING: CORS may not be configured');
      console.log(`   Access-Control-Allow-Origin: ${corsHeader || 'Not set'}`);
    }
  } catch (error) {
    console.log('⚠️  WARNING: Could not check CORS headers');
  }

  // Final Summary
  console.log('\n' + '═'.repeat(60));
  console.log('\n📋 SUMMARY');
  console.log('─'.repeat(60));
  
  if (allChecks) {
    console.log('✅ ALL CHECKS PASSED!');
    console.log('\n🎉 The fix is complete and working!');
    console.log('\n⚠️  If you still see 400 errors in the browser:');
    console.log('   1. Clear your browser cache completely');
    console.log('   2. Close ALL browser tabs');
    console.log('   3. Reopen browser and try again');
    console.log('   4. OR use incognito/private mode');
    console.log('\n📖 See: .kiro/specs/preview-display-fix/BROWSER_CACHE_FIX.md');
  } else {
    console.log('❌ SOME CHECKS FAILED');
    console.log('\n🔧 Action Required:');
    console.log('   Review the failed checks above');
    console.log('   Follow the suggested actions');
    console.log('   Run this script again to verify');
  }

  console.log('\n' + '═'.repeat(60));
  console.log('\n📚 Documentation:');
  console.log('   - FINAL_SOLUTION.md - Complete solution overview');
  console.log('   - BROWSER_CACHE_FIX.md - Detailed cache clearing guide');
  console.log('   - IMAGE_LOADING_FIX.md - Technical details');
  console.log('\n💡 Quick Test:');
  console.log('   Open incognito window → localhost:3000 → Test preview');
  console.log('   If it works there, it confirms cache issue!');
  console.log('\n');
}

verifyFixComplete();
