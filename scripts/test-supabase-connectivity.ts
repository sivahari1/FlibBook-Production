/**
 * Test Supabase connectivity through different methods
 */

async function testSupabaseConnectivity() {
  console.log('🔍 Testing Supabase connectivity...\n');
  
  const supabaseUrl = process.env.SUPABASE_URL || 'https://zuhrivibcgudgsejsljo.supabase.co';
  const anonKey = process.env.SUPABASE_ANON_KEY;
  
  // Test 1: HTTPS API endpoint
  console.log('1. Testing HTTPS API endpoint...');
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      headers: {
        'apikey': anonKey || '',
        'Authorization': `Bearer ${anonKey}`
      }
    });
    console.log(`✅ HTTPS API reachable - Status: ${response.status}\n`);
  } catch (error: any) {
    console.log(`❌ HTTPS API unreachable: ${error.message}\n`);
  }
  
  // Test 2: Check if pooler hostname resolves
  console.log('2. Testing pooler hostname resolution...');
  const poolerHost = 'aws-1-ap-south-1.pooler.supabase.com';
  try {
    const dns = await import('dns').then(m => m.promises);
    const addresses = await dns.resolve4(poolerHost);
    console.log(`✅ Pooler hostname resolves to: ${addresses.join(', ')}\n`);
  } catch (error: any) {
    console.log(`❌ Pooler hostname resolution failed: ${error.message}\n`);
  }
  
  // Test 3: Check if direct DB hostname resolves
  console.log('3. Testing direct DB hostname resolution...');
  const dbHost = 'db.zuhrivibcgudgsejsljo.supabase.co';
  try {
    const dns = await import('dns').then(m => m.promises);
    const addresses = await dns.resolve4(dbHost);
    console.log(`✅ Direct DB hostname resolves to: ${addresses.join(', ')}\n`);
  } catch (error: any) {
    console.log(`❌ Direct DB hostname resolution failed: ${error.message}\n`);
  }
  
  // Test 4: Try Prisma with timeout
  console.log('4. Testing Prisma connection (10s timeout)...');
  try {
    const { prisma } = await import('../lib/db');
    
    // Set a timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection timeout after 10s')), 10000)
    );
    
    const connectPromise = prisma.$connect().then(async () => {
      const Prisma = await import('@prisma/client');
      const result = await prisma.$queryRaw(Prisma.Prisma.sql`SELECT 1 as test`);
      return result;
    });
    
    await Promise.race([connectPromise, timeoutPromise]);
    console.log('✅ Prisma connection successful\n');
  } catch (error: any) {
    console.log(`❌ Prisma connection failed: ${error.message}\n`);
  }
  
  console.log('📊 Summary:');
  console.log('- If HTTPS API works but pooler doesn't, there may be a firewall blocking PostgreSQL ports');
  console.log('- If hostname resolution fails, there may be a DNS issue');
  console.log('- If everything fails, check your internet connection or VPN settings');
  console.log('\n💡 Recommendation:');
  console.log('- For production on Vercel, the pooler should work fine (Vercel has direct AWS connectivity)');
  console.log('- For local development, you may need to:');
  console.log('  1. Check if your ISP/firewall blocks port 5432');
  console.log('  2. Try using a VPN');
  console.log('  3. Use Supabase Studio for database management instead of local Prisma CLI');
}

testSupabaseConnectivity().catch(console.error);
