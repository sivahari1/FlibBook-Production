// This script generates SQL to check the exact email format in the database

console.log('\n📧 Run this SQL in Supabase to check the exact email:\n');
console.log('═'.repeat(80));
console.log(`
SELECT 
  email,
  LENGTH(email) as email_length,
  "passwordHash",
  "userRole",
  "emailVerified",
  "isActive"
FROM users
WHERE email LIKE '%sivaramj83%';
`);
console.log('═'.repeat(80));
console.log('\nThis will show:');
console.log('- The exact email (check for spaces or special characters)');
console.log('- Email length (should be 22 for sivaramj83@gmail.com)');
console.log('- All relevant fields\n');
