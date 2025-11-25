import { prisma } from '../lib/db'

async function testConnection() {
  console.log('🔍 Testing Supabase database connection...\n')
  
  try {
    console.log('Attempting to connect to:', process.env.DATABASE_URL?.split('@')[1]?.split('/')[0] || 'Unknown')
    
    // Simple query to test connection
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    console.log('✅ Database connection successful!')
    console.log('Test query result:', result)
    
    // Try to count users
    const userCount = await prisma.user.count()
    console.log(`✅ Found ${userCount} users in database`)
    
  } catch (error: any) {
    console.error('❌ Database connection failed!')
    console.error('Error:', error.message)
    
    if (error.message.includes("Can't reach database server")) {
      console.error('\n🔴 The database server is unreachable from this machine.')
      console.error('Possible reasons:')
      console.error('  1. Supabase project is paused or inactive')
      console.error('  2. Network/firewall blocking connection')
      console.error('  3. DATABASE_URL is incorrect')
      console.error('  4. Connection pooling limits reached')
    }
  } finally {
    await prisma.$disconnect()
  }
}

testConnection()
