import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

async function diagnoseSupabasePro() {
  console.log('🔍 SUPABASE PRO DIAGNOSTIC\n');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const databaseUrl = process.env.DATABASE_URL;
  
  console.log('1️⃣ Environment Variables Check:');
  console.log(`   Supabase URL: ${supabaseUrl ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Service Key: ${serviceKey ? '✅ Set' : '❌ Missing'}`);
  console.log(`   Database URL: ${databaseUrl ? '✅ Set' : '❌ Missing'}\n`);
  
  if (!supabaseUrl || !serviceKey) {
    console.log('❌ Missing Supabase credentials\n');
    return;
  }
  
  // Test Storage (we know this works)
  console.log('2️⃣ Testing Supabase Storage (should work):');
  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log(`   ❌ Storage Error: ${error.message}\n`);
    } else {
      console.log(`   ✅ Storage Working: ${buckets?.length || 0} buckets found\n`);
    }
  } catch (error: any) {
    console.log(`   ❌ Storage Exception: ${error.message}\n`);
  }
  
  // Test Database via Supabase Client
  console.log('3️⃣ Testing Database via Supabase Client:');
  try {
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data, error } = await supabase
      .from('User')
      .select('count')
      .limit(1);
    
    if (error) {
      console.log(`   ❌ Database Error: ${error.message}`);
      console.log(`   Error Code: ${error.code}`);
      console.log(`   Error Details: ${JSON.stringify(error.details)}\n`);
    } else {
      console.log(`   ✅ Database Working via Supabase Client\n`);
    }
  } catch (error: any) {
    console.log(`   ❌ Database Exception: ${error.message}\n`);
  }
  
  // Parse Database URL
  console.log('4️⃣ Database URL Analysis:');
  if (databaseUrl) {
    try {
      const url = new URL(databaseUrl.replace('postgresql://', 'http://'));
      console.log(`   Host: ${url.hostname}`);
      console.log(`   Port: ${url.port}`);
      console.log(`   Database: ${url.pathname.substring(1)}`);
      console.log(`   User: ${url.username}`);
      console.log(`   Password: ${url.password ? '****' : 'MISSING'}`);
      console.log(`   Params: ${url.search}\n`);
    } catch (error: any) {
      console.log(`   ❌ Invalid URL format: ${error.message}\n`);
    }
  }
  
  // Test Prisma Connection
  console.log('5️⃣ Testing Prisma Connection:');
  try {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$connect();
    console.log('   ✅ Prisma connected successfully');
    
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Query executed successfully\n');
    
    await prisma.$disconnect();
  } catch (error: any) {
    console.log(`   ❌ Prisma Error: ${error.message}`);
    console.log(`   Error Code: ${error.code}\n`);
  }
  
  console.log('═══════════════════════════════════════');
  console.log('📋 POSSIBLE CAUSES FOR PRO TIER:');
  console.log('═══════════════════════════════════════\n');
  
  console.log('1. Password Changed:');
  console.log('   - Someone reset the database password');
  console.log('   - Solution: Get new connection string from Supabase dashboard\n');
  
  console.log('2. IP Restrictions:');
  console.log('   - Pro tier may have IP allowlist enabled');
  console.log('   - Solution: Add your IP to allowlist in Supabase dashboard\n');
  
  console.log('3. Connection Pooler Issue:');
  console.log('   - Pooler might be down or misconfigured');
  console.log('   - Solution: Try direct connection (DIRECT_URL)\n');
  
  console.log('4. Database Maintenance:');
  console.log('   - Supabase might be performing maintenance');
  console.log('   - Solution: Check Supabase status page\n');
  
  console.log('5. Network/Firewall:');
  console.log('   - Local firewall blocking port 5432');
  console.log('   - Solution: Check firewall settings\n');
  
  console.log('🔧 NEXT STEPS:');
  console.log('1. Go to: https://supabase.com/dashboard/project/zuhrivibcgudgsejsljo/settings/database');
  console.log('2. Check "Connection Info" section');
  console.log('3. Verify the password matches your .env file');
  console.log('4. Check "Network Restrictions" tab');
  console.log('5. Try resetting the database password');
}

diagnoseSupabasePro().catch(console.error);
