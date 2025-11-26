import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { razorpay } from '@/lib/razorpay';
import { logger } from '@/lib/logger';
import { createPaymentOrderSchema } from '@/lib/validation/jstudyroom';
import { ZodError } from 'zod';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/payment/create-order
 * Create a Razorpay order for purchasing a Book Shop item
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check authentication
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is a MEMBER
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { userRole: true },
    });

    if (!user || user.userRole !== 'MEMBER') {
      return NextResponse.json(
        { error: 'Only Members can purchase documents' },
        { status: 403 }
      );
    }

    // Apply rate limiting per user
    const rateLimitResult = checkRateLimit(
      `payment-create:${session.user.id}`,
      RATE_LIMITS.PAYMENT_CREATE_ORDER
    );

    if (!rateLimitResult.success) {
      logger.warn('Payment creation rate limit exceeded', { userId: session.user.id });
      return NextResponse.json(
        { 
          error: 'Too many payment attempts. Please try again in a moment.',
          retryAfter: rateLimitResult.retryAfter 
        },
        { 
          status: 429,
          headers: {
            'Retry-After': rateLimitResult.retryAfter?.toString() || '60'
          }
        }
      );
    }

    // Parse and validate request body
    const body = await req.json();
    
    let validatedData;
    try {
      validatedData = createPaymentOrderSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0].message },
          { status: 400 }
        );
      }
      throw error;
    }

    const { bookShopItemId } = validatedData;

    // Get Book Shop item
    const bookShopItem = await prisma.bookShopItem.findUnique({
      where: { id: bookShopItemId },
      include: {
        document: {
          select: {
            title: true,
          },
        },
      },
    });

    if (!bookShopItem) {
      return NextResponse.json(
        { error: 'Book Shop item not found' },
        { status: 404 }
      );
    }

    // Check if item is published
    if (!bookShopItem.isPublished) {
      return NextResponse.json(
        { error: 'This item is not available for purchase' },
        { status: 400 }
      );
    }

    // Check if item is free (shouldn't use payment for free items)
    if (bookShopItem.isFree) {
      return NextResponse.json(
        { error: 'This is a free document. Use the add to My jstudyroom endpoint instead.' },
        { status: 400 }
      );
    }

    // Check if price is set
    if (!bookShopItem.price || bookShopItem.price <= 0) {
      return NextResponse.json(
        { error: 'Invalid item price' },
        { status: 400 }
      );
    }

    // Check if user already has this item
    const existingItem = await prisma.myJstudyroomItem.findUnique({
      where: {
        userId_bookShopItemId: {
          userId: session.user.id,
          bookShopItemId,
        },
      },
    });

    if (existingItem) {
      return NextResponse.json(
        { error: 'You already have this document in My jstudyroom' },
        { status: 409 }
      );
    }

    // Check if user has reached paid document limit
    const userWithCounts = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        paidDocumentCount: true,
      },
    });

    if (userWithCounts && userWithCounts.paidDocumentCount >= 5) {
      return NextResponse.json(
        { error: 'You have reached the maximum of 5 paid documents. Remove a paid document to purchase more.' },
        { status: 400 }
      );
    }

    // Create Razorpay order
    const razorpayOrder = await razorpay.orders.create({
      amount: bookShopItem.price, // Amount in paise
      currency: 'INR',
      receipt: `order_${Date.now()}`,
      notes: {
        userId: session.user.id,
        bookShopItemId,
        documentTitle: bookShopItem.document.title,
      },
    });

    // Create Payment record in database
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        bookShopItemId,
        amount: bookShopItem.price,
        currency: 'INR',
        status: 'pending',
        razorpayOrderId: razorpayOrder.id,
      },
    });

    logger.info('Razorpay order created', {
      orderId: razorpayOrder.id,
      userId: session.user.id,
      bookShopItemId,
      amount: bookShopItem.price,
    });

    return NextResponse.json({
      orderId: razorpayOrder.id,
      amount: bookShopItem.price,
      currency: 'INR',
      paymentId: payment.id,
    });
  } catch (error) {
    logger.error('Error creating Razorpay order', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Failed to create payment order' },
      { status: 500 }
    );
  }
}
