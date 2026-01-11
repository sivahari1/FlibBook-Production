#!/usr/bin/env tsx

/**
 * Test script to verify the BookShop API fix
 */

async function testBookShopAPI() {
  console.log("🧪 Testing BookShop API fix...");
  
  try {
    const response = await fetch("http://localhost:3001/api/bookshop", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log(`📊 Response Status: ${response.status}`);
    console.log(`📊 Response Headers:`, Object.fromEntries(response.headers.entries()));

    const text = await response.text();
    console.log(`📊 Response Text (first 500 chars):`, text.substring(0, 500));

    if (response.ok) {
      try {
        const json = JSON.parse(text);
        console.log("✅ API returned valid JSON");
        console.log(`📊 Response structure:`, {
          ok: json.ok,
          itemsCount: Array.isArray(json.items) ? json.items.length : "not array",
          total: json.total,
          hasError: !!json.error
        });
        
        if (json.ok === true) {
          console.log("✅ API returned success response");
        } else {
          console.log("⚠️ API returned ok:false");
        }
      } catch (parseError) {
        console.error("❌ Failed to parse JSON:", parseError);
      }
    } else {
      console.error(`❌ API returned ${response.status} status`);
      try {
        const json = JSON.parse(text);
        console.log("📊 Error response:", json);
      } catch {
        console.log("📊 Non-JSON error response");
      }
    }

  } catch (error) {
    console.error("❌ Network error:", error);
  }
}

testBookShopAPI().catch(console.error);