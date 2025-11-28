import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local first (takes precedence), then .env
config({ path: resolve(process.cwd(), '.env.local') });
config({ path: resolve(process.cwd(), '.env') });

console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✓ Defined' : '✗ Not defined');
console.log('DIRECT_URL:', process.env.DIRECT_URL ? '✓ Defined' : '✗ Not defined');
console.log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL);
console.log('SUPABASE_URL:', process.env.SUPABASE_URL ? '✓ Defined' : '✗ Not defined');

if (process.env.DATABASE_URL) {
  // Mask the password in the output
  const maskedUrl = process.env.DATABASE_URL.replace(/:([^@]+)@/, ':****@');
  console.log('\nMasked DATABASE_URL:', maskedUrl);
}
