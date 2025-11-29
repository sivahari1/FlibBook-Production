// Diagnose browser-specific login issues
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function diagnoseBrowserLoginIssue() {
  console.log('🔍 BROWSER LOGIN ISSUE DIAGNOSTIC\n');
  console.log('=' .repeat(70));
  
  try {
    // 1. Verify user credentials are correct
    console.log('\n1️⃣  VERIFYING USER CREDENTIALS');
    console.log('-'.repeat(40));
    
    const testEmail = 'sivaramj83@gmail.com';
    const testPassword = 'Admin@123';
    
    const user = await prisma.user.findUnique({
      where: { email: testEmail },
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        isActive: true,
        emailVerified: true,
        passwordHash: true
      }
    });
    
    if (!user) {
      console.log(`❌ User ${testEmail} not found`);
      return;
    }
    
    console.log(`✅ User found: ${user.email}`);
    console.log(`   Role: ${user.userRole}`);
    console.log(`   Active: ${user.isActive}`);
    console.log(`   Verified: ${user.emailVerified}`);
    
    const passwordValid = await bcrypt.compare(testPassword, user.passwordHash);
    console.log(`   Password valid: ${passwordValid ? '✅' : '❌'}`);
    
    if (!passwordValid) {
      console.log('\n❌ PASSWORD MISMATCH - This is the issue!');
      console.log('   The password in the database does not match "Admin@123"');
      console.log('   Run: npx tsx scripts/reset-siva-account.ts');
      return;
    }
    
    // 2. Check NextAuth configuration
    console.log('\n2️⃣  NEXTAUTH CONFIGURATION CHECK');
    console.log('-'.repeat(40));
    
    const requiredEnvVars = {
      'NEXTAUTH_URL': process.env.NEXTAUTH_URL,
      'NEXTAUTH_SECRET': process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing',
      'DATABASE_URL': process.env.DATABASE_URL ? '✅ Set' : '❌ Missing'
    };
    
    for (const [key, value] of Object.entries(requiredEnvVars)) {
      console.log(`   ${key}: ${value}`);
    }
    
    // Check NEXTAUTH_URL specifically
    if (process.env.NEXTAUTH_URL !== 'http://localhost:3000') {
      console.log('\n⚠️  WARNING: NEXTAUTH_URL should be http://localhost:3000 for local dev');
      console.log(`   Current value: ${process.env.NEXTAUTH_URL}`);
    }
    
    // 3. Common browser issues checklist
    console.log('\n3️⃣  BROWSER-SPECIFIC ISSUES CHECKLIST');
    console.log('-'.repeat(40));
    
    console.log('\n📋 Please verify the following in your browser:');
    console.log('\n   A. COOKIES:');
    console.log('      1. Open DevTools (F12) → Application → Cookies');
    console.log('      2. Clear all cookies for localhost:3000');
    console.log('      3. Look for "next-auth.session-token" after login');
    console.log('      4. If cookie is not set, check browser console for errors');
    
    console.log('\n   B. BROWSER CONSOLE:');
    console.log('      1. Open DevTools (F12) → Console');
    console.log('      2. Look for any red errors during login');
    console.log('      3. Check Network tab for failed API calls');
    console.log('      4. Look for CORS or CSP errors');
    
    console.log('\n   C. NETWORK TAB:');
    console.log('      1. Open DevTools (F12) → Network');
    console.log('      2. Try to login');
    console.log('      3. Check POST to /api/auth/callback/credentials');
    console.log('      4. Status should be 200, not 401 or 500');
    console.log('      5. Response should include Set-Cookie header');
    
    console.log('\n   D. BROWSER SETTINGS:');
    console.log('      1. Ensure cookies are enabled');
    console.log('      2. Disable any ad blockers or privacy extensions');
    console.log('      3. Try incognito/private mode');
    console.log('      4. Try a different browser');
    
    // 4. Check for common code issues
    console.log('\n4️⃣  CHECKING LOGIN FORM IMPLEMENTATION');
    console.log('-'.repeat(40));
    
    const fs = await import('fs');
    const path = await import('path');
    
    const loginFormPath = path.join(process.cwd(), 'components', 'auth', 'LoginForm.tsx');
    
    if (fs.existsSync(loginFormPath)) {
      const loginFormContent = fs.readFileSync(loginFormPath, 'utf-8');
      
      const checks = [
        { name: 'signIn import', pattern: /import.*signIn.*from.*next-auth\/react/, critical: true },
        { name: 'signIn call', pattern: /signIn\s*\(/, critical: true },
        { name: 'credentials provider', pattern: /['"']credentials['"]/, critical: true },
        { name: 'redirect: false', pattern: /redirect:\s*false/, critical: false },
        { name: 'callbackUrl', pattern: /callbackUrl/, critical: false }
      ];
      
      for (const check of checks) {
        const found = check.pattern.test(loginFormContent);
        const status = found ? '✅' : (check.critical ? '❌' : '⚠️');
        console.log(`   ${status} ${check.name}: ${found ? 'FOUND' : 'MISSING'}`);
      }
    } else {
      console.log('   ⚠️  LoginForm.tsx not found at expected location');
    }
    
    // 5. Provide specific fix recommendations
    console.log('\n5️⃣  RECOMMENDED FIXES');
    console.log('=' .repeat(70));
    
    console.log('\n🔧 IMMEDIATE ACTIONS:');
    console.log('\n   1. Clear browser data:');
    console.log('      - Press Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)');
    console.log('      - Select "Cookies and other site data"');
    console.log('      - Clear for "All time"');
    console.log('      - Restart browser');
    
    console.log('\n   2. Test in incognito mode:');
    console.log('      - Open incognito/private window');
    console.log('      - Navigate to http://localhost:3000');
    console.log('      - Try login again');
    
    console.log('\n   3. Check browser console:');
    console.log('      - Open DevTools (F12)');
    console.log('      - Go to Console tab');
    console.log('      - Try login and look for errors');
    console.log('      - Share any error messages you see');
    
    console.log('\n   4. Verify server is running:');
    console.log('      - Ensure "npm run dev" is running');
    console.log('      - Check http://localhost:3000/api/health');
    console.log('      - Should return {"status":"ok"}');
    
    console.log('\n📝 IF STILL NOT WORKING:');
    console.log('   Please provide:');
    console.log('   - Browser console errors (if any)');
    console.log('   - Network tab screenshot of login request');
    console.log('   - Browser and version you\'re using');
    
    console.log('\n' + '=' .repeat(70));
    
  } catch (error: any) {
    console.error('\n💥 Diagnostic failed:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseBrowserLoginIssue();
