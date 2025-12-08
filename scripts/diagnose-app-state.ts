/**
 * Diagnostic Script: Check Application State
 * 
 * This script checks:
 * 1. Database connection
 * 2. Documents in database
 * 3. User accounts
 * 4. Storage configuration
 */

import { prisma } from '../lib/db';

async function diagnoseAppState() {
  console.log('🔍 Starting Application Diagnostics...\n');

  try {
    // 1. Test database connection
    console.log('1️⃣ Testing database connection...');
    await prisma.$connect();
    console.log('✅ Database connection successful\n');

    // 2. Check users
    console.log('2️⃣ Checking users...');
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        _count: {
          select: { documents: true }
        }
      }
    });
    console.log(`Found ${users.length} users:`);
    users.forEach(user => {
      console.log(`  - ${user.email} (${user.userRole}) - ${user._count.documents} documents`);
    });
    console.log('');

    // 3. Check documents
    console.log('3️⃣ Checking documents...');
    const documents = await prisma.document.findMany({
      select: {
        id: true,
        title: true,
        filename: true,
        contentType: true,
        storagePath: true,
        linkUrl: true,
        userId: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log(`Found ${documents.length} documents (showing last 10):`);
    if (documents.length === 0) {
      console.log('  ⚠️  No documents found in database');
      console.log('  💡 Upload a document through the dashboard to test');
    } else {
      documents.forEach(doc => {
        console.log(`  - ${doc.title} (${doc.contentType || 'PDF'})`);
        console.log(`    ID: ${doc.id}`);
        console.log(`    File: ${doc.filename}`);
        console.log(`    Storage: ${doc.storagePath || doc.linkUrl || 'N/A'}`);
        console.log(`    Created: ${doc.createdAt.toISOString()}`);
        console.log('');
      });
    }

    // 4. Check environment variables
    console.log('4️⃣ Checking environment configuration...');
    const envVars = [
      'DATABASE_URL',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET',
      'NEXT_PUBLIC_SUPABASE_URL',
      'NEXT_PUBLIC_SUPABASE_ANON_KEY',
      'SUPABASE_SERVICE_ROLE_KEY'
    ];
    
    envVars.forEach(varName => {
      const value = process.env[varName];
      if (value) {
        console.log(`  ✅ ${varName}: ${value.substring(0, 20)}...`);
      } else {
        console.log(`  ❌ ${varName}: NOT SET`);
      }
    });
    console.log('');

    // 5. Summary
    console.log('📊 Summary:');
    console.log(`  - Users: ${users.length}`);
    console.log(`  - Documents: ${documents.length}`);
    console.log(`  - Database: Connected`);
    console.log('');

    if (documents.length === 0) {
      console.log('💡 Next Steps:');
      console.log('  1. Login to the application');
      console.log('  2. Upload a PDF document');
      console.log('  3. Try to preview it');
      console.log('');
    }

    console.log('✅ Diagnostics complete!');

  } catch (error) {
    console.error('❌ Error during diagnostics:', error);
    
    if (error instanceof Error) {
      if (error.message.includes("Can't reach database server")) {
        console.log('\n⚠️  Database Connection Issue:');
        console.log('  - Your Supabase project might be paused');
        console.log('  - Go to https://supabase.com/dashboard');
        console.log('  - Resume your project');
        console.log('  - Wait 1-2 minutes and try again');
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseAppState();
