#!/usr/bin/env tsx

/**
 * Test script for Enhanced Upload Modal with Bookshop Integration
 * Tests the integration between EnhancedUploadModal and BookshopIntegrationSection
 */

import { promises as fs } from 'fs';
import path from 'path';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
}

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];

  try {
    // Test 1: Check if BookshopIntegrationSection is imported
    const modalPath = path.join(process.cwd(), 'components/dashboard/EnhancedUploadModal.tsx');
    const modalContent = await fs.readFile(modalPath, 'utf-8');
    
    results.push({
      test: 'BookshopIntegrationSection Import',
      passed: modalContent.includes("import { BookshopIntegrationSection }"),
      message: modalContent.includes("import { BookshopIntegrationSection }") 
        ? 'BookshopIntegrationSection is properly imported'
        : 'BookshopIntegrationSection import not found'
    });

    // Test 2: Check if BookshopIntegrationSection is used in JSX
    results.push({
      test: 'BookshopIntegrationSection Usage',
      passed: modalContent.includes("<BookshopIntegrationSection"),
      message: modalContent.includes("<BookshopIntegrationSection")
        ? 'BookshopIntegrationSection component is used in JSX'
        : 'BookshopIntegrationSection component not found in JSX'
    });

    // Test 3: Check if bookshop state variables are properly defined
    const hasBookshopState = modalContent.includes('bookShopCategory') && 
                             modalContent.includes('bookShopPrice') && 
                             modalContent.includes('bookShopDescription') &&
                             modalContent.includes('bookShopErrors');
    
    results.push({
      test: 'Bookshop State Variables',
      passed: hasBookshopState,
      message: hasBookshopState
        ? 'All bookshop state variables are defined'
        : 'Some bookshop state variables are missing'
    });

    // Test 4: Check if form validation includes bookshop fields
    results.push({
      test: 'Bookshop Validation',
      passed: modalContent.includes('uploadToBookShop') && modalContent.includes('setBookShopErrors'),
      message: modalContent.includes('uploadToBookShop') && modalContent.includes('setBookShopErrors')
        ? 'Bookshop validation is implemented'
        : 'Bookshop validation is missing'
    });

    // Test 5: Check if API call includes bookshop data
    const hasBookshopApiData = modalContent.includes("formData.append('addToBookshop'") &&
                               modalContent.includes("formData.append('bookshopCategory'") &&
                               modalContent.includes("formData.append('bookshopPrice'");
    
    results.push({
      test: 'Bookshop API Integration',
      passed: hasBookshopApiData,
      message: hasBookshopApiData
        ? 'Bookshop data is included in API call'
        : 'Bookshop data is not properly included in API call'
    });

    // Test 6: Check if success messages handle bookshop items
    results.push({
      test: 'Bookshop Success Messages',
      passed: modalContent.includes('result.bookShopItem') && modalContent.includes('added to'),
      message: modalContent.includes('result.bookShopItem') && modalContent.includes('added to')
        ? 'Success messages handle bookshop items'
        : 'Success messages do not handle bookshop items properly'
    });

    // Test 7: Check BookshopIntegrationSection component structure
    const sectionPath = path.join(process.cwd(), 'components/upload/BookshopIntegrationSection.tsx');
    const sectionContent = await fs.readFile(sectionPath, 'utf-8');
    
    const hasRequiredProps = sectionContent.includes('isEnabled') &&
                            sectionContent.includes('onToggle') &&
                            sectionContent.includes('category') &&
                            sectionContent.includes('price') &&
                            sectionContent.includes('errors');
    
    results.push({
      test: 'BookshopIntegrationSection Props',
      passed: hasRequiredProps,
      message: hasRequiredProps
        ? 'BookshopIntegrationSection has all required props'
        : 'BookshopIntegrationSection is missing some required props'
    });

    // Test 8: Check if categories API is called
    results.push({
      test: 'Categories API Integration',
      passed: sectionContent.includes('/api/bookshop/categories'),
      message: sectionContent.includes('/api/bookshop/categories')
        ? 'Categories API is properly integrated'
        : 'Categories API integration is missing'
    });

  } catch (error) {
    results.push({
      test: 'File Access',
      passed: false,
      message: `Error reading files: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return results;
}

async function main() {
  console.log('🧪 Testing Enhanced Upload Modal with Bookshop Integration\n');

  const results = await runTests();
  
  let passedCount = 0;
  let failedCount = 0;

  results.forEach((result, index) => {
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${index + 1}. ${result.test}: ${status}`);
    console.log(`   ${result.message}\n`);
    
    if (result.passed) {
      passedCount++;
    } else {
      failedCount++;
    }
  });

  console.log(`📊 Test Results: ${passedCount} passed, ${failedCount} failed`);
  
  if (failedCount === 0) {
    console.log('🎉 All tests passed! The Enhanced Upload Modal is properly integrated with Bookshop functionality.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}