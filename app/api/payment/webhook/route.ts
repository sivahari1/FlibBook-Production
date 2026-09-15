import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { canAddDocument } from '@/lib/my-jstudyroom';
import { logger } from '@/lib/logger';
import { sendPurchaseConfirmationEmail } from '@/lib/email';

/**
 * POST /api/payment/webhook
 *
 * Server-to-server Razorpay webhook. This is the source of truth for order
 * fulfillment: /api/payment/verify only confirms the payment for the
 * customer's browser, and if that request never arrives (closed tab, dropped
 * connection, phone lock right after paying), this webhook is what still
 * delivers the purchased document.
 *
 * Configure the webhook URL (https://<your-domain>/api/payment/webhook) and
 * a webhook secret in the Razorpay dashboard under Settings > Webhooks,
 * subscribed to the "payment.captured" and "payment.failed" events, and set
 * that secret as RAZORPAY_WEBHOOK_SECRET. This is a different secret from
 * RAZORPAY_KEY_SECRET used for the checkout signature.
 */
export async function POST(request: NextRequest) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  if (!webhookSecret) {
    logger.error('RAZORPAY_WEBHOOK_SECRET is not configured; rejecting webhook call');
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 });
  }

  // Razorpay signs the raw request body, so it must be read before any JSON parsing.
  const rawBody = await request.text();
  const signature = request.headers.get('x-razorpay-signature');

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 });
  }

  const expectedSignature = crypto
    .createHmac('sha256', webhookSecret)
    .update(rawBody)
    .digest('hex');

  const validSignature =
    expectedSignature.length === signature.length &&
    crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));

  if (!validSignature) {
    logger.warn('Razorpay webhook signature mismatch', {
      ip: request.headers.get('x-forwarded-for') || 'unknown',
    });
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  let event: {
    event?: string;
    payload?: { payment?: { entity?: Record<string, unknown> } };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const eventType = event.event;
  const paymentEntity = event.payload?.payment?.entity;

  logger.info('Razorpay webhook received', { eventType });

  // Always acknowledge events we don't act on, so Razorpay doesn't retry them.
  if (eventType !== 'payment.captured' && eventType !== 'payment.failed') {
    return NextResponse.json({ received: true });
  }

  const razorpayOrderId = paymentEntity?.order_id as string | undefined;
  const razorpayPaymentId = paymentEntity?.id as string | undefined;

  if (!razorpayOrderId || !razorpayPaymentId) {
    logger.error('Razorpay webhook payload missing order/payment id', { eventType });
    return NextResponse.json({ error: 'Malformed payload' }, { status: 400 });
  }

  try {
    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
      include: {
        bookShopItem: { include: { document: { select: { id: true, title: true } } } },
      },
    });

    if (!payment) {
      logger.error('Razorpay webhook: no matching payment record', { razorpayOrderId });
      // Acknowledge anyway. Returning an error here just makes Razorpay retry
      // a lookup that will never succeed.
      return NextResponse.json({ received: true });
    }

    if (eventType === 'payment.failed') {
      if (payment.status !== 'success') {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { status: 'failed', razorpayPaymentId },
        });
      }
      return NextResponse.json({ received: true });
    }

    // eventType === 'payment.captured' from here on.

    // Idempotency: the client-side /verify call may have already fulfilled
    // this order. Treat that as success, not an error, and do nothing twice.
    if (payment.status === 'success') {
      return NextResponse.json({ received: true, alreadyFulfilled: true });
    }

    const existingItem = await prisma.myJstudyroomItem.findUnique({
      where: {
        userId_bookShopItemId: {
          userId: payment.userId,
          bookShopItemId: payment.bookShopItemId,
        },
      },
    });

    if (existingItem) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'success', razorpayPaymentId },
      });
      return NextResponse.json({ received: true, alreadyFulfilled: true });
    }

    const canAdd = await canAddDocument(payment.userId, false);
    if (!canAdd.allowed) {
      logger.error('Razorpay webhook: fulfillment blocked by document limit', {
        userId: payment.userId,
        reason: canAdd.reason,
      });
      // Leave payment status as-is so this is visible for manual follow-up
      // (the customer was charged but the account is at its document cap).
      return NextResponse.json({ received: true, blocked: canAdd.reason });
    }

    const result = await prisma.$transaction(async (tx) => {
      const item = await tx.myJstudyroomItem.create({
        data: {
          userId: payment.userId,
          bookShopItemId: payment.bookShopItemId,
          isFree: false,
        },
      });

      await tx.user.update({
        where: { id: payment.userId },
        data: { paidDocumentCount: { increment: 1 } },
      });

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'success', razorpayPaymentId },
      });

      return item;
    });

    logger.info('Payment fulfilled via webhook', {
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      userId: payment.userId,
      itemId: result.id,
    });

    const user = await prisma.user.findUnique({
      where: { id: payment.userId },
      select: { email: true, name: true },
    });

    if (user) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jstudyroom.dev';
      sendPurchaseConfirmationEmail({
        email: user.email,
        name: user.name || undefined,
        documentTitle: payment.bookShopItem.document.title,
        category: payment.bookShopItem.category,
        price: payment.amount,
        myJstudyroomUrl: `${appUrl}/member/my-jstudyroom`,
        viewDocumentUrl: `${appUrl}/member/view/${result.id}`,
      }).catch((error) => {
        logger.error('Webhook: failed to send purchase confirmation email', {
          error: error instanceof Error ? error.message : 'Unknown error',
          userId: payment.userId,
        });
      });
    }

    return NextResponse.json({ received: true, fulfilled: true });
  } catch (error: unknown) {
    logger.error('Error processing Razorpay webhook', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Return 500 here (unlike the branches above) so Razorpay retries a
    // genuine processing failure instead of silently dropping the event.
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
