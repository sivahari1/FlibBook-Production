import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyPaymentSignature } from '@/lib/razorpay';
import { canAddDocument } from '@/lib/my-jstudyroom';
import { logger } from '@/lib/logger';
import { sendPurchaseConfirmationEmail } from '@/lib/email';
import { verifyPaymentSchema } from '@/lib/validation/jstudyroom';
import { ZodError } from 'zod';
import { checkRateLimit, RATE_LIMITS } from '@/lib/rate-limit';

/**
 * POST /api/payment/verify
 * Verify Razorpay payment and add document to My jstudyroom
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
      select: { 
        userRole: true,
        email: true,
        name: true,
      },
    });

    if (!user || user.userRole !== 'MEMBER') {
      return NextResponse.json(
        { error: 'Only Members can purchase documents' },
        { status: 403 }
      );
    }

    // Apply rate limiting per user
    const rateLimitResult = checkRateLimit(
      `payment-verify:${session.user.id}`,
      RATE_LIMITS.PAYMENT_VERIFY
    );

    if (!rateLimitResult.success) {
      logger.warn('Payment verification rate limit exceeded', { userId: session.user.id });
      return NextResponse.json(
        { 
          error: 'Too many verification attempts. Please try again in a moment.',
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
      validatedData = verifyPaymentSchema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        return NextResponse.json(
          { error: error.issues[0].message },
          { status: 400 }
        );
      }
      throw error;
    }

    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, bookShopItemId } = validatedData;

    // Find payment record
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: {
        bookShopItem: {
          include: {
            document: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json(
        { error: 'Payment record not found' },
        { status: 404 }
      );
    }

    // Verify payment belongs to current user
    if (payment.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Payment does not belong to current user' },
        { status: 403 }
      );
    }

    // Check if payment is already processed
    if (payment.status === 'success') {
      return NextResponse.json(
        { error: 'Payment already processed' },
        { status: 400 }
      );
    }

    // Verify Razorpay signature
    const isValid = verifyPaymentSignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    );

    if (!isValid) {
      // Update payment status to failed
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'failed' },
      });

      logger.error('Payment signature verification failed', {
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        userId: session.user.id,
      });

      return NextResponse.json(
        { error: 'Payment verification failed' },
        { status: 400 }
      );
    }

    // Check document limits before adding
    const canAdd = await canAddDocument(session.user.id, false); // paid document
    if (!canAdd.allowed) {
      // Update payment status but don't add document
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'failed',
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      return NextResponse.json(
        { error: canAdd.reason || 'Cannot add document due to limits' },
        { status: 400 }
      );
    }

    // Check if document already exists in My jstudyroom
    const existingItem = await prisma.myJstudyroomItem.findUnique({
      where: {
        userId_bookShopItemId: {
          userId: session.user.id,
          bookShopItemId: payment.bookShopItemId,
        },
      },
    });

    if (existingItem) {
      // Update payment status but don't add duplicate
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      return NextResponse.json(
        { error: 'Document already in My jstudyroom' },
        { status: 400 }
      );
    }

    // Add document to My jstudyroom and update payment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create My jstudyroom item
      const item = await tx.myJstudyroomItem.create({
        data: {
          userId: session.user.id,
          bookShopItemId: payment.bookShopItemId,
          isFree: false,
        },
      });

      // Update user's paid document count
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          paidDocumentCount: { increment: 1 },
        },
      });

      // Update payment record
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          razorpayPaymentId,
          razorpaySignature,
        },
      });

      return item;
    });

    logger.info('Payment verified and document added', {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      userId: session.user.id,
      bookShopItemId: payment.bookShopItemId,
      itemId: result.id,
    });

    // Send purchase confirmation email (don't wait for it)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jstudyroom.dev';
    const myJstudyroomUrl = `${appUrl}/member/my-jstudyroom`;
    const viewUrl = `${appUrl}/member/view/${result.id}`;

    sendPurchaseConfirmationEmail({
      email: user.email,
      name: user.name || undefined,
      documentTitle: payment.bookShopItem.document.title,
      category: payment.bookShopItem.category,
      price: payment.amount,
      myJstudyroomUrl,
      viewDocumentUrl: viewUrl,
    }).catch((error) => {
      logger.error('Failed to send purchase confirmation email', {
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: session.user.id,
      });
    });

    return NextResponse.json({
      success: true,
      itemId: result.id,
      message: 'Payment verified and document added to My jstudyroom',
    });
  } catch (error) {
    logger.error('Error verifying payment', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
