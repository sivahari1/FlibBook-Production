#!/usr/bin/env tsx

/**
 * Test script to verify the bookshop API fix is working correctly
 * Tests both the API endpoint and UI parsing logic
 */

async function testBookshopAPI() {
  console.log('🧪 Testing Bookshop API Fix...\n');

  try {
    // Test 1: API endpoint returns correct structure
    console.log('1. Testing API endpoint structure...');
    const response = await fetch('http://localhost:3001/api/bookshop', {
      cache: 'no-store'
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}: ${response.statusText}`);
    }

    const json = await response.json();
    console.log('✅ API response received');
    console.log(`   Response type: ${typeof json}`);
    console.log(`   Has 'items' property: ${json.hasOwnProperty('items')}`);
    console.log(`   Has 'total' property: ${json.hasOwnProperty('total')}`);

    // Test 2: Verify response structure matches expected format
    if (!json.items || !Array.isArray(json.items)) {
      throw new Error(`Expected json.items to be an array, got ${typeof json.items}`);
    }

    console.log(`✅ API returns correct structure: { items: Array(${json.items.length}), total: ${json.total} }`);

    // Test 3: Simulate UI parsing logic
    console.log('\n2. Testing UI parsing logic...');
    
    // This is the exact logic from BookShop.tsx
    const items = Array.isArray(json) ? json : (json.items ?? []);
    
    if (!Array.isArray(items)) {
      throw new Error(`UI parsing failed: expected array but got ${typeof items}`);
    }

    console.log(`✅ UI parsing works correctly: extracted ${items.length} items`);

    // Test 4: Verify item structure
    if (items.length > 0) {
      console.log('\n3. Testing item structure...');
      const firstItem = items[0];
      const requiredFields = ['id', 'title', 'category', 'isFree', 'documentId'];
      
      for (const field of requiredFields) {
        if (!(field in firstItem)) {
          throw new Error(`Missing required field: ${field}`);
        }
      }
      
      console.log('✅ Item structure is valid');
      console.log(`   Sample item: ${firstItem.title} (${firstItem.category})`);
    } else {
      console.log('ℹ️  No items in bookshop to test structure');
    }

    // Test 5: Test error handling with invalid response
    console.log('\n4. Testing error handling...');
    
    // Simulate various response types
    const testCases = [
      { name: 'Array response', data: [{ id: '1', title: 'Test' }] },
      { name: 'Object with items', data: { items: [{ id: '1', title: 'Test' }], total: 1 } },
      { name: 'Object without items', data: { total: 0 } },
      { name: 'Null response', data: null },
      { name: 'String response', data: 'invalid' }
    ];

    for (const testCase of testCases) {
      try {
        const testItems = Array.isArray(testCase.data) ? testCase.data : (testCase.data?.items ?? []);
        
        if (!Array.isArray(testItems)) {
          console.log(`   ⚠️  ${testCase.name}: Would throw error (expected behavior)`);
        } else {
          console.log(`   ✅ ${testCase.name}: Parsed ${testItems.length} items`);
        }
      } catch (error) {
        console.log(`   ⚠️  ${testCase.name}: Error handling works`);
      }
    }

    console.log('\n🎉 All tests passed! Bookshop fix is working correctly.');
    console.log('\nNext steps:');
    console.log('1. Visit http://localhost:3001/member/bookshop to test the UI');
    console.log('2. Verify no "data.map is not a function" errors occur');
    console.log('3. Check that items load and display correctly');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testBookshopAPI().catch(console.error);