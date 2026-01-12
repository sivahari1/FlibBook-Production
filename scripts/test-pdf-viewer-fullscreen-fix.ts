#!/usr/bin/env tsx

/**
 * Test script to verify the PDF viewer full-screen fix
 * This script checks that the PDF viewer is properly configured for full-width display
 */

import { readFile } from 'fs/promises';
import { join } from 'path';

async function testPdfViewerFix() {
  console.log('🔍 Testing PDF Viewer Full-Screen Fix...\n');

  try {
    // Read the updated MyJstudyroomViewerClient component
    const componentPath = join(process.cwd(), 'components/viewers/MyJstudyroomViewerClient.tsx');
    const componentContent = await readFile(componentPath, 'utf-8');

    // Test 1: Check for fixed positioning
    const hasFixedPositioning = componentContent.includes('className="fixed left-0 right-0 bottom-0"');
    console.log(`✅ Fixed positioning: ${hasFixedPositioning ? 'PASS' : 'FAIL'}`);

    // Test 2: Check for header height calculation
    const hasHeaderHeight = componentContent.includes('const HEADER_H = 64');
    console.log(`✅ Header height calculation: ${hasHeaderHeight ? 'PASS' : 'FAIL'}`);

    // Test 3: Check for top style property
    const hasTopStyle = componentContent.includes('style={{ top: HEADER_H }}');
    console.log(`✅ Top style property: ${hasTopStyle ? 'PASS' : 'FAIL'}`);

    // Test 4: Check for full width/height iframe
    const hasFullSizeIframe = componentContent.includes('className="w-full h-full border-0 block"');
    console.log(`✅ Full-size iframe: ${hasFullSizeIframe ? 'PASS' : 'FAIL'}`);

    // Test 5: Check for page-width zoom default
    const hasPageWidthZoom = componentContent.includes('#zoom=page-width');
    console.log(`✅ Page-width zoom default: ${hasPageWidthZoom ? 'PASS' : 'FAIL'}`);

    // Test 6: Check that old constrained layout is removed
    const hasOldLayout = componentContent.includes('h-[calc(100vh-88px)]');
    console.log(`✅ Old constrained layout removed: ${!hasOldLayout ? 'PASS' : 'FAIL'}`);

    const allTestsPassed = hasFixedPositioning && hasHeaderHeight && hasTopStyle && 
                          hasFullSizeIframe && hasPageWidthZoom && !hasOldLayout;

    console.log(`\n${allTestsPassed ? '🎉' : '❌'} Overall Result: ${allTestsPassed ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);

    if (allTestsPassed) {
      console.log('\n📋 Expected Results:');
      console.log('• PDF viewer will use full screen width under header');
      console.log('• Default zoom will be "page-width" making document readable');
      console.log('• No horizontal empty space on right side');
      console.log('• Browser width changes will resize the PDF area');
      console.log('• Clicking "Fit Width" will make text readable');
    }

    return allTestsPassed;

  } catch (error) {
    console.error('❌ Error testing PDF viewer fix:', error);
    return false;
  }
}

// Run the test
testPdfViewerFix().then(success => {
  process.exit(success ? 0 : 1);
});