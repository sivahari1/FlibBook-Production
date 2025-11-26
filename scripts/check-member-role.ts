import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkMemberRole() {
  try {
    console.log('Checking member users...\n');
    
    // Find all users with MEMBER role
    const members = await prisma.user.findMany({
      where: {
        userRole: 'MEMBER'
      },
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        isActive: true,
        createdAt: true
      }
    });
    
    console.log(`Found ${members.length} member(s):\n`);
    members.forEach(member => {
      console.log(`ID: ${member.id}`);
      console.log(`Email: ${member.email}`);
      console.log(`Name: ${member.name}`);
      console.log(`Role: ${member.userRole}`);
      console.log(`Active: ${member.isActive}`);
      console.log(`Created: ${member.createdAt}`);
      console.log('---');
    });
    
    // Also check if there are users who should be members but have wrong role
    console.log('\nChecking all users:');
    const allUsers = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        userRole: true,
        isActive: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10
    });
    
    console.log('\nRecent users:');
    allUsers.forEach(user => {
      console.log(`${user.email} - Role: ${user.userRole} - Active: ${user.isActive}`);
    });
    
  } catch (error) {
    console.error('Error checking member role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMemberRole();
