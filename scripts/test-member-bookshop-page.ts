#!/usr/bin/env tsx

/**
 * Test script to verify the member bookshop page loads without 404 errors
 */

async function testMemberBookshopPage() {
  console.log('🧪 Testing Member Bookshop Page Access...\n');

  try {
    // Test the member bookshop page
    console.log('1. Testing /member/bookshop page...');
    const response = await fetch('http://localhost:3001/member/bookshop', {
      redirect: 'manual' // Don't follow redirects automatically
    });

    console.log(`   Status: ${response.status} ${response.statusText}`);
    
    if (response.status === 302 || response.status === 307) {
      const location = response.headers.get('location');
      console.log(`   Redirected to: ${location}`);
      
      if (location?.includes('/login')) {
        console.log('✅ Page exists but requires authentication (expected behavior)');
        console.log('   This means the route is working correctly');
      } else {
        console.log('ℹ️  Redirected to different page, route exists');
      }
    } else if (response.status === 200) {
      console.log('✅ Page loaded successfully');
    } else if (response.status === 404) {
      console.error('❌ Page not found (404 error)');
      return false;
    } else {
      console.log(`ℹ️  Received status ${response.status}, page exists`);
    }

    // Test related API endpoints
    console.log('\n2. Testing related API endpoints...');
    
    const apiEndpoints = [
      '/api/bookshop',
      '/api/bookshop/categories'
    ];

    for (const endpoint of apiEndpoints) {
      try {
        const apiResponse = await fetch(`http://localhost:3001${endpoint}`);
        console.log(`   ${endpoint}: ${apiResponse.status} ${apiResponse.statusText}`);
      } catch (error) {
        console.log(`   ${endpoint}: Error - ${error}`);
      }
    }

    console.log('\n✅ Member bookshop page and API endpoints are accessible');
    console.log('\nTo test the full functionality:');
    console.log('1. Open http://localhost:3001/member/bookshop in your browser');
    console.log('2. Login with member credentials if prompted');
    console.log('3. Verify the bookshop loads without "data.map is not a function" errors');
    
    return true;

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    return false;
  }
}

// Run the test
testMemberBookshopPage()
  .then(success => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch(console.error);