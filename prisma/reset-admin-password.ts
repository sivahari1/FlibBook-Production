import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]
  const newPassword = process.argv[3]

  if (!email || !newPassword) {
    console.error('❌ Usage: npx tsx prisma/reset-admin-password.ts <email> <new-password>')
    console.error('\nExample:')
    console.error('  npx tsx prisma/reset-admin-password.ts sivaramj83@gmail.com "MyNewPassword123!"')
    process.exit(1)
  }

  console.log(`\n🔄 Resetting password for: ${email}`)

  // Check if user exists
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() }
  })

  if (!user) {
    console.error(`\n❌ User not found: ${email}`)
    console.error('\nAvailable users:')
    const allUsers = await prisma.user.findMany({
      select: { email: true, name: true, userRole: true }
    })
    allUsers.forEach(u => {
      console.log(`  - ${u.email} (${u.name || 'No name'}) - Role: ${u.userRole}`)
    })
    process.exit(1)
  }

  // Hash the new password
  console.log('🔐 Hashing password...')
  const passwordHash = await bcrypt.hash(newPassword, 12)

  // Update the password
  const updatedUser = await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { 
      passwordHash,
      emailVerified: true, // Ensure email is verified
      isActive: true // Ensure account is active
    }
  })

  console.log('\n✅ Password reset successful!')
  console.log(`\nUser Details:`)
  console.log(`  Email: ${updatedUser.email}`)
  console.log(`  Name: ${updatedUser.name || 'Not set'}`)
  console.log(`  Role: ${updatedUser.userRole}`)
  console.log(`  Email Verified: ${updatedUser.emailVerified}`)
  console.log(`  Account Active: ${updatedUser.isActive}`)
  console.log(`\n🔑 New Password: ${newPassword}`)
  console.log(`\n🌐 Login at: ${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login`)
  console.log('\n⚠️  Remember to change this password after logging in!')
}

main()
  .catch((error) => {
    console.error('\n❌ Error:', error.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
