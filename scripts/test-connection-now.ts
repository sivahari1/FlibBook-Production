import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function testConnection() {
  console.log('🔍 Testing database connection...')
  console.log('Database URL:', process.env.DATABASE_URL?.substring(0, 50) + '...')
  
  try {
    // Test basic connection
    await prisma.$connect()
    console.log('✅ Database connection successful!')
    
    // Test a simple query
    const userCount = await prisma.user.count()
    console.log(`✅ Found ${userCount} users in database`)
    
    // Test document count
    const docCount = await prisma.document.count()
    console.log(`✅ Found ${docCount} documents in database`)
    
    console.log('🎉 Database is working perfectly!')
  } catch (error: any) {
    console.error('❌ Database connection failed:')
    console.error(error)
    
    // Check if it's a network issue
    if (error.message?.includes('P1001')) {
      console.log('\n🔧 NETWORK ISSUE DETECTED:')
      console.log('1. Check your internet connection')
      console.log('2. Try using a VPN if you\'re behind a firewall')
      console.log('3. Check if Supabase is accessible from your location')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
