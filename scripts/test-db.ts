#!/usr/bin/env tsx
/**
 * Database Connection Test Script
 * 
 * Tests Prisma database connectivity by running a simple SELECT 1 query.
 * This verifies that DATABASE_URL is correctly configured.
 * 
 * Usage: npx tsx scripts/test-db.ts
 */

import { config } from 'dotenv'
import { prisma } from '../lib/db'

// Load environment variables
config({ path: '.env.local' })
config({ path: '.env' })

async function testDatabaseConnection() {
  console.log('🔍 Testing Supabase database connection...\n')
  
  try {
    // Test connection
    await prisma.$connect()
    console.log('✅ Prisma client connected successfully')
    
    // Run test query
    const result = await prisma.$queryRaw`SELECT 1 as test`
    console.log('✅ Test query executed successfully')
    console.log('📊 Result:', result)
    
    // Test a simple model query
    const userCount = await prisma.user.count()
    console.log(`✅ User count query successful: ${userCount} users in database`)
    
    console.log('\n✨ All database tests passed!')
    process.exit(0)
  } catch (error: any) {
    console.error('\n❌ Database connection failed!')
    console.error('Error:', error.message)
    
    if (error.message.includes('Can\'t reach database server')) {
      console.error('\n💡 Troubleshooting tips:')
      console.error('1. Check that DATABASE_URL is set in .env.local')
      console.error('2. Verify the database password is correct')
      console.error('3. Ensure special characters in password are URL-encoded')
      console.error('4. Check Supabase project status: https://status.supabase.com')
      console.error('5. Verify your IP is not blocked by Supabase')
    }
    
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testDatabaseConnection()
