import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import MembersClient from './MembersClient'

export const metadata = {
  title: 'Member Management - Admin',
  description: 'Manage jstudyroom members',
}

export default async function MembersPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.userRole !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch all members
  const members = await prisma.user.findMany({
    where: {
      userRole: 'MEMBER'
    },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerified: true,
      emailVerifiedAt: true,
      createdAt: true,
      freeDocumentCount: true,
      paidDocumentCount: true,
      isActive: true,
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return <MembersClient members={members} />
}
