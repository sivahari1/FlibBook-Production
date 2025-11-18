import bcrypt from 'bcryptjs'

async function generateHash() {
  const password = process.argv[2] || 'Admin123!'
  const hash = await bcrypt.hash(password, 12)
  
  console.log('\n=================================')
  console.log('Password Hash Generator')
  console.log('=================================')
  console.log(`Password: ${password}`)
  console.log(`Hash: ${hash}`)
  console.log('=================================\n')
  console.log('SQL Query to update:')
  console.log(`UPDATE users SET "passwordHash" = '${hash}' WHERE email = 'sivaramj83@gmail.com';`)
  console.log('\n')
}

generateHash()
