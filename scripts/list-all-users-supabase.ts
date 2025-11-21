import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function listUsers() {
  try {
    console.log('🔍 Fetching all users from Supabase...\n');
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Get all users
    const { data: users, error } = await supabase
      .from('user')
      .select('id, email, name, role, userRole, isActive, passwordHash')
      .order('email');
    
    if (error) {
      console.error('❌ Error:', error.message);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No users found');
      return;
    }
    
    console.log(`✅ Found ${users.length} users:\n`);
    
    for (const user of users) {
      console.log('─────────────────────────────────');
      console.log('Email:', user.email);
      console.log('Name:', user.name);
      console.log('Role:', user.role);
      console.log('UserRole:', user.userRole);
      console.log('Active:', user.isActive);
      console.log('Has Password:', !!user.passwordHash);
      
      // Test password for sivaramj83@gmail.com
      if (user.email === 'sivaramj83@gmail.com' && user.passwordHash) {
        const testPassword = 'Admin123!';
        const isValid = await bcrypt.compare(testPassword, user.passwordHash);
        console.log(`🔐 Password "${testPassword}": ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      }
      console.log('');
    }
    
    console.log('─────────────────────────────────\n');
    
    // Find admin user
    const adminUser = users.find(u => u.email === 'sivaramj83@gmail.com');
    if (adminUser && adminUser.passwordHash) {
      console.log('🎯 Testing login for sivaramj83@gmail.com...');
      const testPassword = 'Admin123!';
      const isValid = await bcrypt.compare(testPassword, adminUser.passwordHash);
      
      if (isValid) {
        console.log('✅ Login credentials are CORRECT!');
        console.log('\n📝 You can login with:');
        console.log('Email: sivaramj83@gmail.com');
        console.log('Password: Admin123!');
      } else {
        console.log('❌ Password does not match!');
        console.log('The password was changed to something else.');
      }
    }
    
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
}

listUsers();
