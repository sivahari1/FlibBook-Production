import bcrypt from 'bcryptjs';

/**
 * Verify if a password matches the stored hash
 * This helps diagnose login issues
 */

async function verifyPassword() {
  const email = 'sivaramj83@gmail.com';
  const password = 'FlipBook123!';
  
  console.log('🔍 Verifying password for:', email);
  console.log('Password to test:', password);
  console.log('');
  
  // Try to connect to database
  try {
    import { prisma } from '../lib/db';
    
    console.log('Attempting to fetch user from database...');
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        passwordHash: true,
        isActive: true,
        emailVerified: true,
        userRole: true
      }
    });
    
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    console.log('✅ User found:');
    console.log('   ID:', user.id);
    console.log('   Email:', user.email);
    console.log('   Name:', user.name);
    console.log('   Active:', user.isActive);
    console.log('   Email Verified:', user.emailVerified);
    console.log('   Role:', user.userRole);
    console.log('');
    
    // Test password
    console.log('Testing password...');
    const isValid = await bcrypt.compare(password, user.passwordHash);
    
    if (isValid) {
      console.log('✅ PASSWORD MATCHES! Login should work.');
    } else {
      console.log('❌ PASSWORD DOES NOT MATCH!');
      console.log('');
      console.log('The password in the database is different from what you\'re entering.');
      console.log('You need to reset the password.');
    }
    
    await prisma.$disconnect();
    
  } catch (error) {
    console.log('❌ Database connection failed:', (error as Error).message);
    console.log('');
    console.log('This is a NETWORK ISSUE, not a code issue.');
    console.log('Your firewall or ISP is blocking port 5432.');
    console.log('');
    console.log('Solutions:');
    console.log('1. Deploy to Vercel (production) - it will work there');
    console.log('2. Use Supabase Studio to manage database');
    console.log('3. Disable firewall/VPN temporarily');
    console.log('4. Contact your network administrator');
  }
}

verifyPassword();
