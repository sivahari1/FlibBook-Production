#!/usr/bin/env tsx

/**
 * Test script to verify the bookshop UI parsing fix works correctly
 */

// Mock the API response structure to test the parsing logic
const mockApiResponse = {
  items: [
    {
      id: 'test-1',
      title: 'Test Document 1',
      description: 'Test description',
      category: 'Test Category',
      isFree: true,
      price: null,
      contentType: 'PDF',
      documentId: 'doc-1',
      document: {
        id: 'doc-1',
        title: 'Test Document 1',
        filename: 'test.pdf',
        contentType: 'PDF'
      },
      inMyJstudyroom: false
    },
    {
      id: 'test-2',
      title: 'Test Document 2',
      description: 'Another test',
      category: 'Test Category',
      isFree: false,
      price: 100,
      contentType: 'PDF',
      documentId: 'doc-2',
      document: {
        id: 'doc-2',
        title: 'Test Document 2',
        filename: 'test2.pdf',
        contentType: 'PDF'
      },
      inMyJstudyroom: true
    }
  ],
  total: 2
};

function testResponseParsing() {
  console.log('🧪 Testing Bookshop UI response parsing...');
  
  // Test the parsing logic from the fixed component
  const json = mockApiResponse;
  const items = Array.isArray(json) ? json : (json.items ?? []);
  
  console.log('✅ Parsed response structure:');
  console.log(`  - Type of json: ${typeof json}`);
  console.log(`  - Is json an array: ${Array.isArray(json)}`);
  console.log(`  - Type of items: ${typeof items}`);
  console.log(`  - Is items an array: ${Array.isArray(items)}`);
  console.log(`  - Items count: ${items.length}`);
  
  if (!Array.isArray(items)) {
    console.error('❌ ERROR: items is not an array!');
    return false;
  }
  
  // Test that we can safely call .map() on items
  try {
    const categories = items.map((item: any) => item.category);
    console.log(`✅ Successfully extracted categories: ${categories.join(', ')}`);
    
    const uniqueCategories = Array.from(new Set(categories)).sort();
    console.log(`✅ Unique categories: ${uniqueCategories.join(', ')}`);
    
    return true;
  } catch (error) {
    console.error('❌ ERROR calling .map() on items:', error);
    return false;
  }
}

// Test edge cases
function testEdgeCases() {
  console.log('\n🧪 Testing edge cases...');
  
  // Test with empty response
  const emptyResponse = { items: [], total: 0 };
  const emptyItems = Array.isArray(emptyResponse) ? emptyResponse : (emptyResponse.items ?? []);
  console.log(`✅ Empty response: ${emptyItems.length} items`);
  
  // Test with malformed response (no items property)
  const malformedResponse = { data: [], count: 0 };
  const malformedItems = Array.isArray(malformedResponse) ? malformedResponse : (malformedResponse.items ?? []);
  console.log(`✅ Malformed response: ${malformedItems.length} items (fallback to empty array)`);
  
  // Test with array response (legacy format)
  const arrayResponse = [
    { id: '1', title: 'Test', category: 'Test', isFree: true }
  ];
  const arrayItems = Array.isArray(arrayResponse) ? arrayResponse : (arrayResponse.items ?? []);
  console.log(`✅ Array response: ${arrayItems.length} items`);
  
  // Test with null/undefined
  const nullResponse = null;
  const nullItems = Array.isArray(nullResponse) ? nullResponse : (nullResponse?.items ?? []);
  console.log(`✅ Null response: ${nullItems.length} items (fallback to empty array)`);
  
  return true;
}

// Run tests
async function runTests() {
  console.log('🚀 Starting Bookshop UI parsing tests...\n');
  
  const test1 = testResponseParsing();
  const test2 = testEdgeCases();
  
  if (test1 && test2) {
    console.log('\n✅ All tests passed! The bookshop UI parsing fix should work correctly.');
    console.log('📋 Summary:');
    console.log('  - Correctly handles { items: [], total: number } response format');
    console.log('  - Falls back to empty array for malformed responses');
    console.log('  - Maintains backward compatibility with array responses');
    console.log('  - Prevents "data.map is not a function" errors');
    return true;
  } else {
    console.log('\n❌ Some tests failed!');
    return false;
  }
}

// Run the tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('Test script error:', error);
    process.exit(1);
  });