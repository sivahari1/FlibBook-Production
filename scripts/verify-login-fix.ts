import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function verifyLoginFix() {
  console.log('🔍 Verifying Login Fix\n');
  console.log('=' .repeat(60));
  
  let allChecks = true;
  
  try {
    // Check 1: Database Connection
    console.log('\n✓ Check 1: Database Connection');
    await prisma.$connect();
    console.log('  ✅ Database connected successfully');
    
    // Check 2: User Accounts
    console.log('\n✓ Check 2: User Accounts');
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['sivaramj83@gmail.com', 'hariharanr@gmail.com']
        }
      },
      select: {
        email: true,
        name: true,
        userRole: true,
        isActive: true,
        emailVerified: true,
        passwordHash: true
      }
    });
    
    if (users.length !== 2) {
      console.log('  ❌ Expected 2 admin users, found', users.length);
      allChecks = false;
    } else {
      console.log('  ✅ Found 2 admin accounts');
      
      for (const user of users) {
        console.log(`\n  Account: ${user.email}`);
        console.log(`    - Role: ${user.userRole}`);
        console.log(`    - Active: ${user.isActive ? '✅' : '❌'}`);
        console.log(`    - Email Verified: ${user.emailVerified ? '✅' : '❌'}`);
        
        // Verify password
        const isValid = await bcrypt.compare('Admin@123', user.passwordHash);
        console.log(`    - Password "Admin@123": ${isValid ? '✅' : '❌'}`);
        
        if (!isValid || !user.isActive || !user.emailVerified || user.userRole !== 'ADMIN') {
          allChecks = false;
        }
      }
    }
    
    // Check 3: Environment Variables
    console.log('\n✓ Check 3: Environment Variables');
    const requiredEnvVars = [
      'DATABASE_URL',
      'NEXTAUTH_URL',
      'NEXTAUTH_SECRET'
    ];
    
    let envOk = true;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`  ✅ ${envVar} is set`);
      } else {
        console.log(`  ❌ ${envVar} is missing`);
        envOk = false;
        allChecks = false;
      }
    }
    
    // Check 4: NextAuth API Route
    console.log('\n✓ Check 4: NextAuth API Route');
    const nextAuthRoutePath = path.join(process.cwd(), 'app', 'api', 'auth', '[...nextauth]', 'route.ts');
    if (fs.existsSync(nextAuthRoutePath)) {
      console.log('  ✅ NextAuth API route exists');
    } else {
      console.log('  ❌ NextAuth API route missing');
      allChecks = false;
    }
    
    // Check 5: Auth Configuration
    console.log('\n✓ Check 5: Auth Configuration');
    const authPath = path.join(process.cwd(), 'lib', 'auth.ts');
    const authContent = fs.readFileSync(authPath, 'utf-8');
    
    const checks = [
      { name: 'Provider ID', pattern: /id:\s*["']credentials["']/ },
      { name: 'Simplified redirect', pattern: /if \(url\.startsWith\(["']\/["']\)\)/ },
      { name: 'Pages config', pattern: /pages:\s*{/ }
    ];
    
    for (const check of checks) {
      if (check.pattern.test(authContent)) {
        console.log(`  ✅ ${check.name} configured`);
      } else {
        console.log(`  ❌ ${check.name} missing`);
        allChecks = false;
      }
    }
    
    // Check 6: Middleware Configuration
    console.log('\n✓ Check 6: Middleware Configuration');
    const middlewarePath = path.join(process.cwd(), 'middleware.ts');
    const middlewareContent = fs.readFileSync(middlewarePath, 'utf-8');
    
    if (middlewareContent.includes('Skip rate limiting for NextAuth internal routes')) {
      console.log('  ✅ Middleware allows NextAuth routes');
    } else {
      console.log('  ❌ Middleware may be blocking NextAuth');
      allChecks = false;
    }
    
    // Final Summary
    console.log('\n' + '='.repeat(60));
    if (allChecks) {
      console.log('\n🎉 ALL CHECKS PASSED! Login should work now.\n');
      console.log('Next steps:');
      console.log('1. Restart your dev server: npm run dev');
      console.log('2. Clear browser cache or use incognito mode');
      console.log('3. Go to: http://localhost:3000/login');
      console.log('4. Login with:');
      console.log('   Email: sivaramj83@gmail.com');
      console.log('   Password: Admin@123');
    } else {
      console.log('\n⚠️  SOME CHECKS FAILED');
      console.log('\nPlease review the failed checks above.');
      console.log('See LOGIN_FIX_FINAL.md for detailed instructions.');
    }
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error during verification:', error);
    allChecks = false;
  } finally {
    await prisma.$disconnect();
  }
  
  process.exit(allChecks ? 0 : 1);
}

verifyLoginFix();
