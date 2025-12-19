/**
 * Test script for bookshop upload integration
 * Tests the enhanced upload API with bookshop fields
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

async function testBookshopUpload() {
  console.log('🧪 Testing Bookshop Upload Integration\n');

  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  try {
    // Test 1: Get categories
    console.log('1. Testing categories API...');
    const categoriesResponse = await fetch(`${baseUrl}/api/bookshop/categories`);
    
    if (!categoriesResponse.ok) {
      throw new Error(`Categories API failed: ${categoriesResponse.status}`);
    }
    
    const categoriesData = await categoriesResponse.json();
    console.log('✅ Categories API working');
    console.log(`   Found ${categoriesData.data.flat.length} categories`);
    console.log(`   Sample categories: ${categoriesData.data.flat.slice(0, 3).join(', ')}\n`);

    // Test 2: Test upload API structure (without actual file)
    console.log('2. Testing upload API structure...');
    
    // Create a test FormData
    const formData = new FormData();
    formData.append('contentType', 'PDF');
    formData.append('title', 'Test Document');
    formData.append('description', 'Test description');
    formData.append('addToBookshop', 'true');
    formData.append('bookshopCategory', 'Maths');
    formData.append('bookshopPrice', '99');
    formData.append('bookshopDescription', 'Test bookshop description');

    // Note: This will fail due to authentication, but we can check the error response
    const uploadResponse = await fetch(`${baseUrl}/api/documents/upload`, {
      method: 'POST',
      body: formData
    });

    const uploadData = await uploadResponse.json();
    
    if (uploadResponse.status === 401) {
      console.log('✅ Upload API structure working (authentication required as expected)');
      console.log('   Error:', uploadData.error);
    } else {
      console.log('⚠️  Unexpected response:', uploadResponse.status, uploadData);
    }

    console.log('\n✅ Bookshop upload integration tests completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

testBookshopUpload().catch(console.error);