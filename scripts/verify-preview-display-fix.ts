/**
 * Verification Script for Preview Display Fix
 * 
 * This script verifies that all changes from tasks 1-6 work together correctly:
 * - Task 1: Watermark defaults to false
 * - Task 2: Content visibility and z-index layering
 * - Task 3: Full-size viewport display
 * - Task 4: URL parameter parsing
 * - Task 5: ImageViewer watermark handling
 * - Task 6: VideoPlayer watermark handling
 * 
 * Requirements validated: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 4.2, 4.3, 4.5, 5.2, 5.3
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  passed: boolean;
  details: string;
  requirement: string;
}

const results: TestResult[] = [];

function addResult(name: string, passed: boolean, details: string, requirement: string) {
  results.push({ name, passed, details, requirement });
  console.log(`${passed ? '✅' : '❌'} ${name}`);
  if (!passed) {
    console.log(`   Details: ${details}`);
  }
  console.log(`   Validates: ${requirement}\n`);
}

console.log('🔍 Verifying Preview Display Fix Implementation\n');
console.log('=' .repeat(80) + '\n');

// Test 1: Verify FlipBookContainerWithDRM watermark default behavior
console.log('📋 Task 1: Watermark Default Behavior\n');

try {
  const flipbookContainerPath = join(process.cwd(), 'components/flipbook/FlipBookContainerWithDRM.tsx');
  const flipbookContainerContent = readFileSync(flipbookContainerPath, 'utf-8');

  // Check default parameter is false
  const hasCorrectDefault = flipbookContainerContent.includes('showWatermark = false');
  addResult(
    'FlipBookContainerWithDRM defaults showWatermark to false',
    hasCorrectDefault,
    hasCorrectDefault ? 'Default parameter is correctly set to false' : 'Default parameter is not false',
    'Requirements 1.1, 1.2, 1.3'
  );

  // Check watermark only used when explicitly enabled
  const hasCorrectLogic = flipbookContainerContent.includes('showWatermark && watermarkText');
  addResult(
    'Watermark only used when explicitly enabled with text',
    hasCorrectLogic,
    hasCorrectLogic ? 'Watermark logic correctly checks both showWatermark and watermarkText' : 'Watermark logic is incorrect',
    'Requirements 1.1, 1.2, 1.3'
  );

  // Check no userEmail fallback when watermark disabled
  const noUserEmailFallback = !flipbookContainerContent.match(/watermarkText\s*\|\|\s*userEmail/);
  addResult(
    'No userEmail fallback when watermark is disabled',
    noUserEmailFallback,
    noUserEmailFallback ? 'userEmail is not used as fallback' : 'userEmail is still used as fallback',
    'Requirements 1.2, 1.3'
  );
} catch (error) {
  addResult(
    'FlipBookContainerWithDRM file check',
    false,
    `Error reading file: ${error}`,
    'Requirements 1.1, 1.2, 1.3'
  );
}

// Test 2: Verify content visibility and z-index layering
console.log('📋 Task 2: Content Visibility and Z-Index Layering\n');

try {
  const flipbookViewerPath = join(process.cwd(), 'components/flipbook/FlipBookViewer.tsx');
  const flipbookViewerContent = readFileSync(flipbookViewerPath, 'utf-8');

  // Check watermark z-index is 1
  const hasCorrectWatermarkZIndex = flipbookViewerContent.includes('zIndex: 1') && 
                                     flipbookViewerContent.match(/watermarkText.*zIndex:\s*1/s);
  addResult(
    'Watermark overlay uses z-index: 1',
    hasCorrectWatermarkZIndex,
    hasCorrectWatermarkZIndex ? 'Watermark z-index is correctly set to 1' : 'Watermark z-index is not 1',
    'Requirements 2.1, 2.4, 2.5'
  );

  // Check content has z-index: 0
  const hasCorrectContentZIndex = flipbookViewerContent.includes('zIndex: 0') &&
                                   flipbookViewerContent.match(/img.*zIndex:\s*0/s);
  addResult(
    'Content layer uses z-index: 0',
    hasCorrectContentZIndex,
    hasCorrectContentZIndex ? 'Content z-index is correctly set to 0' : 'Content z-index is not 0',
    'Requirements 2.1, 2.4, 2.5'
  );

  // Check single opacity value for watermark
  const hasSingleOpacity = flipbookViewerContent.match(/watermarkText.*opacity:\s*0\.2[,\s]/s) !== null;
  addResult(
    'Watermark uses single opacity value',
    hasSingleOpacity,
    hasSingleOpacity ? 'Watermark has single opacity declaration' : 'Watermark opacity is not simplified',
    'Requirements 2.4, 2.5'
  );
} catch (error) {
  addResult(
    'FlipBookViewer z-index check',
    false,
    `Error reading file: ${error}`,
    'Requirements 2.1, 2.4, 2.5'
  );
}

// Test 3: Verify full-size viewport display
console.log('📋 Task 3: Full-Size Viewport Display\n');

try {
  const flipbookViewerPath = join(process.cwd(), 'components/flipbook/FlipBookViewer.tsx');
  const flipbookViewerContent = readFileSync(flipbookViewerPath, 'utf-8');

  // Check desktop width is 80%
  const hasCorrectDesktopWidth = flipbookViewerContent.includes('containerWidth * 0.8');
  addResult(
    'Desktop uses 80% of container width',
    hasCorrectDesktopWidth,
    hasCorrectDesktopWidth ? 'Desktop width calculation is correct' : 'Desktop width is not 80%',
    'Requirements 3.1, 3.2, 3.3'
  );

  // Check mobile width is 95%
  const hasCorrectMobileWidth = flipbookViewerContent.includes('containerWidth * 0.95');
  addResult(
    'Mobile uses 95% of container width',
    hasCorrectMobileWidth,
    hasCorrectMobileWidth ? 'Mobile width calculation is correct' : 'Mobile width is not 95%',
    'Requirements 3.1, 3.2, 3.3'
  );

  // Check h-screen is used
  const usesFullHeight = flipbookViewerContent.includes('h-screen');
  addResult(
    'Container uses h-screen for full viewport height',
    usesFullHeight,
    usesFullHeight ? 'Container uses h-screen class' : 'Container does not use h-screen',
    'Requirements 3.1, 3.2, 3.4'
  );

  // Check padding is reduced to p-4
  const hasReducedPadding = flipbookViewerContent.includes('p-4') && 
                            flipbookViewerContent.match(/justify-center.*p-4/s);
  addResult(
    'Padding reduced to p-4 for more content space',
    hasReducedPadding,
    hasReducedPadding ? 'Padding is correctly set to p-4' : 'Padding is not p-4',
    'Requirements 3.1, 3.3'
  );
} catch (error) {
  addResult(
    'FlipBookViewer viewport check',
    false,
    `Error reading file: ${error}`,
    'Requirements 3.1, 3.2, 3.3, 3.4'
  );
}

// Test 4: Verify URL parameter parsing
console.log('📋 Task 4: URL Parameter Parsing\n');

try {
  const previewClientPath = join(process.cwd(), 'app/dashboard/documents/[id]/view/PreviewViewerClient.tsx');
  const previewClientContent = readFileSync(previewClientPath, 'utf-8');

  // Check watermark config is only created when enabled
  const hasCorrectWatermarkConfig = previewClientContent.includes('enableWatermark') &&
                                     previewClientContent.match(/enableWatermark\s*\?\s*\{/);
  addResult(
    'Watermark config only created when enableWatermark is true',
    hasCorrectWatermarkConfig,
    hasCorrectWatermarkConfig ? 'Watermark config logic is correct' : 'Watermark config logic is incorrect',
    'Requirements 1.4, 4.5'
  );

  // Check console logging for debugging
  const hasDebugLogging = previewClientContent.includes('console.log') &&
                          previewClientContent.includes('Watermark Settings');
  addResult(
    'Debug logging present for watermark settings',
    hasDebugLogging,
    hasDebugLogging ? 'Console logging is present for debugging' : 'No debug logging found',
    'Requirements 5.3'
  );

  // Check watermark passed to FlipBookContainerWithDRM
  const passesWatermarkCorrectly = previewClientContent.includes('showWatermark={enableWatermark}');
  addResult(
    'enableWatermark correctly passed to FlipBookContainerWithDRM',
    passesWatermarkCorrectly,
    passesWatermarkCorrectly ? 'showWatermark prop is correctly passed' : 'showWatermark prop not passed correctly',
    'Requirements 1.4, 4.5'
  );
} catch (error) {
  addResult(
    'PreviewViewerClient URL parameter check',
    false,
    `Error reading file: ${error}`,
    'Requirements 1.4, 4.5, 5.3'
  );
}

// Test 5: Verify ImageViewer watermark handling
console.log('📋 Task 5: ImageViewer Watermark Handling\n');

try {
  const imageViewerPath = join(process.cwd(), 'components/viewers/ImageViewer.tsx');
  const imageViewerContent = readFileSync(imageViewerPath, 'utf-8');

  // Check watermark only renders when text is provided
  const hasConditionalRendering = imageViewerContent.includes('watermark?.text') &&
                                   imageViewerContent.match(/\{watermark\?\.text\s*&&/);
  addResult(
    'ImageViewer only renders watermark when text is provided',
    hasConditionalRendering,
    hasConditionalRendering ? 'Watermark conditional rendering is correct' : 'Watermark always renders',
    'Requirements 4.2, 5.2'
  );

  // Check watermark z-index is 1
  const hasCorrectZIndex = imageViewerContent.match(/watermark.*zIndex:\s*1/s) !== null;
  addResult(
    'ImageViewer watermark uses z-index: 1',
    hasCorrectZIndex,
    hasCorrectZIndex ? 'Watermark z-index is correct' : 'Watermark z-index is not 1',
    'Requirements 4.2, 5.2'
  );

  // Check watermark respects opacity and fontSize from config
  const respectsConfig = imageViewerContent.includes('watermark.opacity') &&
                         imageViewerContent.includes('watermark.fontSize');
  addResult(
    'ImageViewer respects watermark config (opacity, fontSize)',
    respectsConfig,
    respectsConfig ? 'Watermark config is respected' : 'Watermark config is not used',
    'Requirements 4.2'
  );
} catch (error) {
  addResult(
    'ImageViewer watermark check',
    false,
    `Error reading file: ${error}`,
    'Requirements 4.2, 5.2'
  );
}

// Test 6: Verify VideoPlayer watermark handling
console.log('📋 Task 6: VideoPlayer Watermark Handling\n');

try {
  const videoPlayerPath = join(process.cwd(), 'components/viewers/VideoPlayer.tsx');
  const videoPlayerContent = readFileSync(videoPlayerPath, 'utf-8');

  // Check watermark only renders when text is provided
  const hasConditionalRendering = videoPlayerContent.includes('watermark?.text') &&
                                   videoPlayerContent.match(/\{watermark\?\.text\s*&&/);
  addResult(
    'VideoPlayer only renders watermark when text is provided',
    hasConditionalRendering,
    hasConditionalRendering ? 'Watermark conditional rendering is correct' : 'Watermark always renders',
    'Requirements 4.3, 5.2'
  );

  // Check watermark z-index is 1
  const hasCorrectZIndex = videoPlayerContent.match(/watermark.*zIndex:\s*1/s) !== null;
  addResult(
    'VideoPlayer watermark uses z-index: 1',
    hasCorrectZIndex,
    hasCorrectZIndex ? 'Watermark z-index is correct' : 'Watermark z-index is not 1',
    'Requirements 4.3, 5.2'
  );

  // Check watermark respects opacity and fontSize from config
  const respectsConfig = videoPlayerContent.includes('watermark.opacity') &&
                         videoPlayerContent.includes('watermark.fontSize');
  addResult(
    'VideoPlayer respects watermark config (opacity, fontSize)',
    respectsConfig,
    respectsConfig ? 'Watermark config is respected' : 'Watermark config is not used',
    'Requirements 4.3'
  );

  // Check watermark positioned over video
  const hasCorrectPositioning = videoPlayerContent.includes('absolute inset-0') &&
                                videoPlayerContent.match(/watermark.*absolute inset-0/s);
  addResult(
    'VideoPlayer watermark correctly positioned over video',
    hasCorrectPositioning,
    hasCorrectPositioning ? 'Watermark positioning is correct' : 'Watermark positioning is incorrect',
    'Requirements 4.3'
  );
} catch (error) {
  addResult(
    'VideoPlayer watermark check',
    false,
    `Error reading file: ${error}`,
    'Requirements 4.3, 5.2'
  );
}

// Summary
console.log('\n' + '='.repeat(80));
console.log('\n📊 VERIFICATION SUMMARY\n');

const totalTests = results.length;
const passedTests = results.filter(r => r.passed).length;
const failedTests = totalTests - passedTests;

console.log(`Total Tests: ${totalTests}`);
console.log(`✅ Passed: ${passedTests}`);
console.log(`❌ Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%\n`);

if (failedTests > 0) {
  console.log('❌ FAILED TESTS:\n');
  results.filter(r => !r.passed).forEach(result => {
    console.log(`  • ${result.name}`);
    console.log(`    Details: ${result.details}`);
    console.log(`    Requirement: ${result.requirement}\n`);
  });
}

// Group by requirement
console.log('\n📋 REQUIREMENTS COVERAGE:\n');
const requirementMap = new Map<string, { passed: number; total: number }>();

results.forEach(result => {
  const reqs = result.requirement.split(',').map(r => r.trim());
  reqs.forEach(req => {
    if (!requirementMap.has(req)) {
      requirementMap.set(req, { passed: 0, total: 0 });
    }
    const stats = requirementMap.get(req)!;
    stats.total++;
    if (result.passed) stats.passed++;
  });
});

Array.from(requirementMap.entries())
  .sort((a, b) => a[0].localeCompare(b[0]))
  .forEach(([req, stats]) => {
    const status = stats.passed === stats.total ? '✅' : '⚠️';
    console.log(`${status} ${req}: ${stats.passed}/${stats.total} tests passed`);
  });

console.log('\n' + '='.repeat(80) + '\n');

// Exit with appropriate code
if (failedTests > 0) {
  console.log('⚠️  Some tests failed. Please review the implementation.\n');
  process.exit(1);
} else {
  console.log('✅ All verification tests passed! The preview display fix is working correctly.\n');
  console.log('Next steps:');
  console.log('  1. Test preview without watermark settings (should show no watermark)');
  console.log('  2. Test preview with watermark enabled (should show watermark)');
  console.log('  3. Test preview with watermark disabled explicitly (should show no watermark)');
  console.log('  4. Verify content is visible and fills viewport');
  console.log('  5. Test across different content types (PDF, image, video, link)\n');
  process.exit(0);
}
