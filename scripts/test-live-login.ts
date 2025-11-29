// Test live login against running dev server
import fetch from 'node-fetch';

async function testLiveLogin() {
  console.log('🔍 Testing Live Login Flow\n');
  
  const baseUrl = 'http://localhost:3000';
  
  try {
    // Test 1: Check if server is running
    console.log('1. Checking if dev server is running...');
    try {
      const healthCheck = await fetch(`${baseUrl}/api/health`);
      console.log(`✅ Server is running (Status: ${healthCheck.status})\n`);
    } catch (error) {
      console.log('❌ Server is NOT running!');
      console.log('   Please start the dev server with: npm run dev\n');
      return;
    }
    
    // Test 2: Check NextAuth API endpoint
    console.log('2. Checking NextAuth API endpoint...');
    try {
      const nextAuthCheck = await fetch(`${baseUrl}/api/auth/providers`);
      const providers = await nextAuthCheck.json();
      console.log(`✅ NextAuth API is accessible`);
      console.log(`   Available providers:`, Object.keys(providers));
      console.log('');
    } catch (error) {
      console.log('❌ NextAuth API is NOT accessible');
      console.log('   Error:', error);
      console.log('');
    }
    
    // Test 3: Attempt login with correct credentials
    console.log('3. Testing login with credentials...\n');
    
    const testAccounts = [
      { email: 'sivaramj83@gmail.com', password: 'Admin@123', name: 'Siva' },
      { email: 'hariharanr@gmail.com', password: 'Admin@123', name: 'Hariharan' }
    ];
    
    for (const account of testAccounts) {
      console.log(`   Testing ${account.name} (${account.email})...`);
      
      try {
        const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: account.email,
            password: account.password,
            json: true
          })
        });
        
        console.log(`   Response Status: ${loginResponse.status}`);
        
        if (loginResponse.ok) {
          console.log(`   ✅ Login successful!`);
          const data = await loginResponse.json();
          console.log(`   Response:`, data);
        } else {
          console.log(`   ❌ Login failed`);
          const errorText = await loginResponse.text();
          console.log(`   Error:`, errorText.substring(0, 200));
        }
      } catch (error: any) {
        console.log(`   ❌ Request failed:`, error.message);
      }
      console.log('');
    }
    
    // Test 4: Check CSRF token
    console.log('4. Checking CSRF token...');
    try {
      const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
      const csrfData = await csrfResponse.json();
      console.log(`✅ CSRF token available:`, csrfData.csrfToken ? 'Yes' : 'No');
      console.log('');
    } catch (error) {
      console.log('❌ Could not get CSRF token');
      console.log('');
    }
    
  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

testLiveLogin();
