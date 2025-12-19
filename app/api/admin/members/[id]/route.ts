import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user || session.user.userRole !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { id: memberId } = await params

    const member = await prisma.user.findUnique({
      where: {
        id: memberId,
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
        myJstudyroomItems: {
          select: {
            id: true,
            isFree: true,
            addedAt: true,
            bookShopItem: {
              select: {
                id: true,
                title: true,
                category: true,
                price: true,
              }
            }
          },
          orderBy: {
            addedAt: 'desc'
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            bookShopItem: {
              select: {
                title: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!member) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(member)
  } catch (error: unknown) {
    logger.error('Error fetching member details:', error)
    return NextResponse.json(
      { error: 'Failed to fetch member details' },
      { status: 500 }
    )
  }
}
