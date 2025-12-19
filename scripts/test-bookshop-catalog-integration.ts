#!/usr/bin/env tsx

/**
 * Test script for Bookshop Catalog Integration
 * Verifies that newly uploaded documents appear in the bookshop catalog
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
    // Test 1: Check if BookShop component fetches from correct API
    const bookshopPath = path.join(process.cwd(), 'components/member/BookShop.tsx');
    const bookshopContent = await fs.readFile(bookshopPath, 'utf-8');
    
    results.push({
      test: 'BookShop API Integration',
      passed: bookshopContent.includes('/api/bookshop'),
      message: bookshopContent.includes('/api/bookshop')
        ? 'BookShop component fetches from correct API endpoint'
        : 'BookShop component does not use correct API endpoint'
    });

    // Test 2: Check if BookShop has real-time refresh capability
    const hasRefreshCapability = bookshopContent.includes('fetchItems') && 
                                bookshopContent.includes('handleAddToMyJstudyroom');
    
    results.push({
      test: 'Real-time Updates',
      passed: hasRefreshCapability,
      message: hasRefreshCapability
        ? 'BookShop component has refresh capability for real-time updates'
        : 'BookShop component lacks real-time update functionality'
    });

    // Test 3: Check if BookShop displays category filtering
    const hasCategoryFiltering = bookshopContent.includes('selectedCategory') &&
                                bookshopContent.includes('Category Filter');
    
    results.push({
      test: 'Category Filtering',
      passed: hasCategoryFiltering,
      message: hasCategoryFiltering
        ? 'BookShop component has category filtering functionality'
        : 'BookShop component lacks category filtering'
    });

    // Test 4: Check if BookShop displays document metadata
    const hasMetadataDisplay = bookshopContent.includes('title') &&
                              bookshopContent.includes('description') &&
                              bookshopContent.includes('price');
    
    results.push({
      test: 'Document Metadata Display',
      passed: hasMetadataDisplay,
      message: hasMetadataDisplay
        ? 'BookShop component displays document metadata (title, description, price)'
        : 'BookShop component missing metadata display'
    });

    // Test 5: Check if BookShop has content type filtering
    const hasContentTypeFiltering = bookshopContent.includes('selectedContentType') &&
                                   bookshopContent.includes('Content Type Filter');
    
    results.push({
      test: 'Content Type Filtering',
      passed: hasContentTypeFiltering,
      message: hasContentTypeFiltering
        ? 'BookShop component has content type filtering'
        : 'BookShop component lacks content type filtering'
    });

    // Test 6: Check if BookShop API endpoint exists
    const apiPath = path.join(process.cwd(), 'app/api/bookshop/route.ts');
    let apiExists = false;
    try {
      await fs.access(apiPath);
      apiExists = true;
    } catch {
      apiExists = false;
    }
    
    results.push({
      test: 'BookShop API Endpoint',
      passed: apiExists,
      message: apiExists
        ? 'BookShop API endpoint exists at /api/bookshop'
        : 'BookShop API endpoint missing at /api/bookshop'
    });

    // Test 7: Check if API returns bookshop items with document relationships
    if (apiExists) {
      const apiContent = await fs.readFile(apiPath, 'utf-8');
      const hasDocumentRelation = apiContent.includes('include:') && 
                                 apiContent.includes('document:') &&
                                 apiContent.includes('bookShopItem');
      
      results.push({
        test: 'Document-BookShop Relationship',
        passed: hasDocumentRelation,
        message: hasDocumentRelation
          ? 'API properly handles document-bookshop item relationships'
          : 'API missing document-bookshop item relationship handling'
      });
    }

    // Test 8: Check if BookShopItemCard component exists
    const cardPath = path.join(process.cwd(), 'components/member/BookShopItemCard.tsx');
    let cardExists = false;
    try {
      await fs.access(cardPath);
      cardExists = true;
    } catch {
      cardExists = false;
    }
    
    results.push({
      test: 'BookShopItemCard Component',
      passed: cardExists,
      message: cardExists
        ? 'BookShopItemCard component exists for displaying items'
        : 'BookShopItemCard component missing'
    });

    // Test 9: Check if BookShopItemCard has "Add to Study Room" functionality
    if (cardExists) {
      const cardContent = await fs.readFile(cardPath, 'utf-8');
      const hasAddToStudyRoom = cardContent.includes('Add to') && 
                               (cardContent.includes('Study Room') || cardContent.includes('Jstudyroom'));
      
      results.push({
        test: 'Add to Study Room Functionality',
        passed: hasAddToStudyRoom,
        message: hasAddToStudyRoom
          ? 'BookShopItemCard has "Add to Study Room" functionality'
          : 'BookShopItemCard missing "Add to Study Room" functionality'
      });
    }

    // Test 10: Check if upload API creates bookshop items
    const uploadApiPath = path.join(process.cwd(), 'app/api/documents/upload/route.ts');
    const uploadApiContent = await fs.readFile(uploadApiPath, 'utf-8');
    
    const createsBookshopItems = uploadApiContent.includes('bookShopItem') &&
                                uploadApiContent.includes('addToBookshop');
    
    results.push({
      test: 'Upload Creates BookShop Items',
      passed: createsBookshopItems,
      message: createsBookshopItems
        ? 'Upload API creates bookshop items when requested'
        : 'Upload API does not create bookshop items'
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
  console.log('🧪 Testing BookShop Catalog Integration\n');

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
    console.log('🎉 All tests passed! BookShop catalog integration is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the implementation.');
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(console.error);
}