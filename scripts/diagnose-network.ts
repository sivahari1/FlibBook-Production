/**
 * Diagnose network connectivity to Supabase
 */

async function diagnoseNetwork() {
  console.log('Testing Supabase connectivity...\n');
  
  const supabaseUrl = 'https://zuhrivibcgudgsejsljo.supabase.co';
  const poolerHost = 'aws-1-ap-south-1.pooler.supabase.com';
  
  // Test 1: HTTPS API
  console.log('1. Testing HTTPS API...');
  try {
    const response = await fetch(supabaseUrl + '/rest/v1/');
    console.log('   Status:', response.status);
    console.log('   ✅ HTTPS API is reachable\n');
  } catch (error) {
    console.log('   ❌ HTTPS API failed:', (error as Error).message, '\n');
  }
  
  // Test 2: DNS resolution
  console.log('2. Testing DNS resolution...');
  try {
    const dns = require('dns').promises;
    const addresses = await dns.resolve4(poolerHost);
    console.log('   Pooler resolves to:', addresses.join(', '));
    console.log('   ✅ DNS resolution works\n');
  } catch (error) {
    console.log('   ❌ DNS failed:', (error as Error).message, '\n');
  }
  
  // Test 3: Database connection
  console.log('3. Testing database connection...');
  console.log('   This may take up to 10 seconds...');
  try {
    const { prisma } = require('../lib/db');
    
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Timeout after 10s')), 10000)
    );
    
    const connect = prisma.$connect();
    
    await Promise.race([connect, timeout]);
    console.log('   ✅ Database connection successful\n');
    await prisma.$disconnect();
  } catch (error) {
    console.log('   ❌ Database connection failed:', (error as Error).message, '\n');
  }
  
  console.log('Summary:');
  console.log('--------');
  console.log('If HTTPS works but database does not:');
  console.log('  - Your firewall may be blocking PostgreSQL port 5432');
  console.log('  - Try disabling VPN or firewall temporarily');
  console.log('  - Contact your network administrator');
  console.log('');
  console.log('For production deployment:');
  console.log('  - Vercel has direct AWS connectivity');
  console.log('  - The pooler should work fine in production');
  console.log('  - Update Vercel environment variables and redeploy');
}

diagnoseNetwork().catch(console.error);
