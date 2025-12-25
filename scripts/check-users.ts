#!/usr/bin/env tsx

import { prisma } from "../lib/db";

async function checkUsers() {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, userRole: true }
    });
    
    console.log("Users in database:");
    users.forEach(user => {
      console.log(`- ${user.email} (${user.name}) - Role: ${user.userRole}`);
    });
    
    if (users.length === 0) {
      console.log("No users found in database");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUsers();