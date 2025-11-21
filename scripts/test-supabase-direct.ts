import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

async function testSupabase() {
  try {
    console.log('🔍 Testing Supabase connection...');
    console.log('URL:', supabaseUrl);
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Try to query the users table (lowercase in Supabase)
    const { data, error, count } = await supabase
      .from('user')
      .select('*', { count: 'exact', head: true });
    
    if (error) {
      console.error('❌ Supabase query failed:', error.message);
      return;
    }
    
    console.log('✅ Supabase connection successful!');
    console.log(`📊 Found ${count} users in database`);
    
    // Try to get the specific user
    const { data: user, error: userError } = await supabase
      .from('user')
      .select('*')
      .eq('email', 'sivaramj83@gmail.com')
      .single();
    
    if (userError) {
      console.error('❌ User query failed:', userError.message);
      return;
    }
    
    console.log('✅ User found:', user.email);
    console.log('Role:', user.role);
    console.log('Active:', user.isActive);
    
  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
  }
}

testSupabase();
