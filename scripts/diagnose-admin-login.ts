import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function diagnoseAdminLogin() {
  try {
    console.log('🔍 Diagnosing admin login issue...\n');
    
    // Check if admin user exists
    const adminEmail = 'sivaramj83@gmail.com';
    const admin = await prisma.user.findUnique({
      where: { email: adminEmail },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        userRole: true,
        emailVerified: true,
        isActive: true,
        subscription: true,
        passwordHash: true,
        createdAt: true,
        updatedAt: true,
      }
    });

    if (!admin) {
      console.log('❌ Admin user not found!');
      console.log(`   Email: ${adminEmail}`);
      console.log('\n💡 Solution: Create admin user first');
      return;
    }

    console.log('✅ Admin user found:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Role: ${admin.role}`);
    console.log(`   UserRole: ${admin.userRole}`);
    console.log(`   Email Verified: ${admin.emailVerified}`);
    console.log(`   Is Active: ${admin.isActive}`);
    console.log(`   Subscription: ${admin.subscription}`);
    console.log(`   Created: ${admin.createdAt}`);
    console.log(`   Updated: ${admin.updatedAt}`);
    console.log(`   Password Hash: ${admin.passwordHash.substring(0, 20)}...`);

    // Check password
    console.log('\n🔐 Testing password "Admin123!"...');
    const testPassword = 'Admin123!';
    const isPasswordValid = await bcrypt.compare(testPassword, admin.passwordHash);
    
    if (isPasswordValid) {
      console.log('✅ Password is correct!');
    } else {
      console.log('❌ Password does NOT match!');
      console.log('\n💡 Resetting password to "Admin123!"...');
      
      const newPasswordHash = await bcrypt.hash(testPassword, 12);
      await prisma.user.update({
        where: { email: adminEmail },
        data: { passwordHash: newPasswordHash }
      });
      
      console.log('✅ Password reset successfully!');
    }

    // Check for issues
    console.log('\n🔍 Checking for potential issues:');
    
    const issues = [];
    
    if (admin.userRole !== 'ADMIN') {
      issues.push(`❌ UserRole is "${admin.userRole}" but should be "ADMIN"`);
    }
    
    if (!admin.emailVerified) {
      issues.push('⚠️  Email is not verified');
    }
    
    if (!admin.isActive) {
      issues.push('❌ Account is not active');
    }
    
    if (issues.length === 0) {
      console.log('✅ No issues found!');
    } else {
      console.log('Issues found:');
      issues.forEach(issue => console.log(`   ${issue}`));
      
      console.log('\n💡 Fixing issues...');
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          userRole: 'ADMIN',
          emailVerified: true,
          isActive: true,
          subscription: 'free'
        }
      });
      console.log('✅ Issues fixed!');
    }

    console.log('\n✅ Diagnosis complete!');
    console.log('\n📝 Summary:');
    console.log(`   Email: ${adminEmail}`);
    console.log(`   Password: Admin123!`);
    console.log(`   UserRole: ADMIN`);
    console.log(`   Status: Active & Verified`);
    console.log('\n🎯 Try logging in now!');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

diagnoseAdminLogin();
