// Test Supabase Pro connection with detailed diagnostics
import { PrismaClient } from '@prisma/client';

async function testSupabaseProConnection() {
  console.log('🔍 SUPABASE PRO CONNECTION TEST\n');
  console.log('=' .repeat(70));
  
  // Test 1: Environment variables
  console.log('\n1️⃣  ENVIRONMENT VARIABLES');
  console.log('-'.repeat(40));
  console.log(`DATABASE_URL: ${process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'}`);
  console.log(`DIRECT_URL: ${process.env.DIRECT_URL ? '✅ Set' : '❌ Missing'}`);
  
  if (process.env.DATABASE_URL) {
    const dbUrl = process.env.DATABASE_URL;
    const match = dbUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)/);
    if (match) {
      console.log(`\n   Connection Details:`);
      console.log(`   - User: ${match[1]}`);
      console.log(`   - Host: ${match[3]}`);
      console.log(`   - Port: ${match[4]}`);
      console.log(`   - Database: ${match[5]}`);
    }
  }
  
  // Test 2: Try connection with pooler
  console.log('\n2️⃣  TESTING POOLER CONNECTION');
  console.log('-'.repeat(40));
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    }
  });
  
  try {
    console.log('   Attempting connection...');
    await prisma.$connect();
    console.log('   ✅ Pooler connection: SUCCESS');
    
    // Try a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   ✅ Query execution: SUCCESS');
    
    // Check user count
    const userCount = await prisma.user.count();
    console.log(`   ✅ User table accessible: ${userCount} users`);
    
  } catch (error: any) {
    console.log('   ❌ Pooler connection: FAILED');
    console.log(`   Error: ${error.message}`);
    
    if (error.message.includes("Can't reach database server")) {
      console.log('\n   🔍 DIAGNOSIS: Database server unreachable');
      console.log('   Possible causes:');
      console.log('   1. Supabase project is paused (check dashboard)');
      console.log('   2. Network/firewall blocking connection');
      console.log('   3. Connection pooler not enabled');
      console.log('   4. Database credentials changed');
    }
  } finally {
    await prisma.$disconnect();
  }
  
  // Test 3: Try direct connection
  console.log('\n3️⃣  TESTING DIRECT CONNECTION');
  console.log('-'.repeat(40));
  
  const prismaDirect = new PrismaClient({
    datasources: {
      db: {
        url: process.env.DIRECT_URL
      }
    }
  });
  
  try {
    console.log('   Attempting direct connection...');
    await prismaDirect.$connect();
    console.log('   ✅ Direct connection: SUCCESS');
    
    const userCount = await prismaDirect.user.count();
    console.log(`   ✅ User table accessible: ${userCount} users`);
    
  } catch (error: any) {
    console.log('   ❌ Direct connection: FAILED');
    console.log(`   Error: ${error.message}`);
  } finally {
    await prismaDirect.$disconnect();
  }
  
  // Test 4: Check Supabase project status
  console.log('\n4️⃣  SUPABASE PROJECT STATUS CHECK');
  console.log('-'.repeat(40));
  console.log('\n   Please verify in Supabase Dashboard:');
  console.log('   1. Go to: https://supabase.com/dashboard/project/zuhrivibcgudgsejsljo');
  console.log('   2. Check project status (should be "Active")');
  console.log('   3. Verify database is not paused');
  console.log('   4. Check "Database" → "Connection pooling" is enabled');
  console.log('   5. Verify your IP is not blocked');
  
  console.log('\n5️⃣  RECOMMENDED ACTIONS');
  console.log('=' .repeat(70));
  console.log('\n   If database is paused:');
  console.log('   - Supabase Pro projects pause after inactivity');
  console.log('   - Go to dashboard and click "Resume" or "Restore"');
  console.log('   - Wait 2-3 minutes for database to start');
  
  console.log('\n   If connection pooling is disabled:');
  console.log('   - Go to Database → Connection Pooling');
  console.log('   - Enable "Session" mode pooling');
  console.log('   - Copy the new connection string');
  console.log('   - Update DATABASE_URL in .env');
  
  console.log('\n   If credentials changed:');
  console.log('   - Go to Database → Connection string');
  console.log('   - Copy the new connection strings');
  console.log('   - Update both DATABASE_URL and DIRECT_URL in .env');
  
  console.log('\n' + '=' .repeat(70));
}

testSupabaseProConnection();
