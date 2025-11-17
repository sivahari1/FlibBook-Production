import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import PaymentsClient from './PaymentsClient'

export const metadata = {
  title: 'Payments - Admin',
  description: 'View all payment transactions',
}

export default async function PaymentsPage() {
  const session = await getServerSession(authOptions)

  if (!session?.user || session.user.userRole !== 'ADMIN') {
    redirect('/login')
  }

  // Fetch all payments
  const payments = await prisma.payment.findMany({
    select: {
      id: true,
      amount: true,
      currency: true,
      status: true,
      razorpayOrderId: true,
      razorpayPaymentId: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          email: true,
          name: true,
        }
      },
      bookShopItem: {
        select: {
          id: true,
          title: true,
          category: true,
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return <PaymentsClient payments={payments} />
}
