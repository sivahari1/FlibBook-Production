import { PrismaClient } from '@prisma/client';

const variants = [
  // Original with %21 encoding
  "postgresql://postgres:FlipBook123%21@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres?sslmode=require",
  // With ! directly
  "postgresql://postgres:FlipBook123!@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres?sslmode=require",
  // Different user format
  "postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123!@db.zuhrivibcgudgsejsljo.supabase.co:5432/postgres?sslmode=require",
  // Pooler with correct format
  "postgresql://postgres.zuhrivibcgudgsejsljo:FlipBook123!@aws-1-ap-south-1.pooler.supabase.com:5432/postgres",
];

async function testVariant(url: string, index: number) {
  console.log(`\n🔍 Testing variant ${index + 1}:`);
  console.log(url.replace(/:[^:@]+@/, ':****@'));
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    }
  });
  
  try {
    await prisma.$connect();
    const count = await prisma.user.count();
    console.log(`✅ SUCCESS! Found ${count} users`);
    await prisma.$disconnect();
    return true;
  } catch (error: any) {
    console.log(`❌ FAILED: ${error.message.split('\n')[0]}`);
    await prisma.$disconnect();
    return false;
  }
}

async function testAll() {
  console.log('Testing different connection string variants...\n');
  
  for (let i = 0; i < variants.length; i++) {
    const success = await testVariant(variants[i], i);
    if (success) {
      console.log('\n🎉 Found working connection string!');
      console.log('Use this in your .env file:');
      console.log(variants[i]);
      break;
    }
  }
}

testAll();
