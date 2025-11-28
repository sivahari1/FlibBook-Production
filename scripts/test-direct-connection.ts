import { PrismaClient } from '@prisma/client';

const directUrl = "postgresql://postgres:FlipBook123%21@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres?sslmode=require";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: directUrl
    }
  }
});

async function testDirectConnection() {
  console.log('🔍 Testing DIRECT database connection...\n');
  
  try {
    await prisma.$connect();
    console.log('✅ Successfully connected to database!\n');
    
    // Try to query users
    const users = await prisma.user.findMany({
      where: {
        OR: [
          { email: 'sivaramj83@gmail.com' },
          { email: 'hariharanr@gmail.com' }
        ]
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        additionalRoles: true
      }
    });
    
    console.log('📊 Found users:');
    users.forEach(user => {
      console.log(`\n👤 ${user.email}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Additional Roles: ${user.additionalRoles || 'none'}`);
    });
    
  } catch (error) {
    console.error('❌ Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDirectConnection();
