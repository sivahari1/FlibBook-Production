import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { verifyPaymentSignature, SubscriptionTier, SUBSCRIPTION_PLANS } from '@/lib/razorpay';
import { sanitizeString } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic'
export const revalidate = 0
export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { 
      razorpay_order_id: razorpay_order_id_raw,
      razorpay_payment_id: razorpay_payment_id_raw,
      razorpay_signature: razorpay_signature_raw,
      plan: planRaw
    } = body;
    
    // Sanitize inputs
    const razorpay_order_id = sanitizeString(razorpay_order_id_raw);
    const razorpay_payment_id = sanitizeString(razorpay_payment_id_raw);
    const razorpay_signature = sanitizeString(razorpay_signature_raw);
    const plan = sanitizeString(planRaw);

    // Validate required fields
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !plan) {
      return NextResponse.json(
        { error: 'Missing required payment details' },
        { status: 400 }
      );
    }

    // Validate plan
    if (!['pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    // Verify payment signature
    const isValid = verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid payment signature' },
        { status: 400 }
      );
    }

    const tier = plan as SubscriptionTier;
    const planDetails = SUBSCRIPTION_PLANS[tier];
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 30); // 30-day subscription

    // Create subscription record and update user in a transaction
    const [subscription, user] = await prisma.$transaction([
      prisma.subscription.create({
        data: {
          userId: session.user.id,
          plan: tier,
          status: 'active',
          startDate,
          endDate,
          razorpayOrderId: razorpay_order_id,
          razorpayPaymentId: razorpay_payment_id,
          amount: planDetails.price,
          currency: 'INR',
        },
      }),
      prisma.user.update({
        where: { id: session.user.id },
        data: { subscription: tier },
      }),
    ]);

    logger.info('Payment verified and subscription activated', {
      userId: session.user.id,
      subscriptionId: subscription.id,
      plan: tier,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id
    });

    return NextResponse.json({
      success: true,
      subscription: {
        id: subscription.id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
      },
      message: 'Subscription activated successfully',
    });
  } catch (error: unknown) {
    logger.error('Error verifying payment', error);
    return NextResponse.json(
      { error: 'Failed to verify payment' },
      { status: 500 }
    );
  }
}
