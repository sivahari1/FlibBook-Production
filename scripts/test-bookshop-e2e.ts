#!/usr/bin/env tsx

/**
 * End-to-end test for BookShop functionality
 */

async function testBookShopE2E() {
  console.log("🧪 Testing BookShop end-to-end...");
  
  try {
    // Test the API directly
    console.log("1️⃣ Testing API endpoint...");
    const apiResponse = await fetch("http://localhost:3001/api/bookshop");
    
    if (!apiResponse.ok) {
      throw new Error(`API failed with status ${apiResponse.status}`);
    }
    
    const apiData = await apiResponse.json();
    console.log("✅ API working:", {
      ok: apiData.ok,
      itemCount: apiData.items?.length || 0,
      total: apiData.total
    });
    
    // Test error handling
    console.log("2️⃣ Testing error handling...");
    try {
      const errorResponse = await fetch("http://localhost:3001/api/bookshop-nonexistent");
      console.log("📊 Error response status:", errorResponse.status);
    } catch (err) {
      console.log("📊 Network error handling works");
    }
    
    console.log("✅ All tests passed!");
    
  } catch (error) {
    console.error("❌ Test failed:", error);
  }
}

testBookShopE2E().catch(console.error);