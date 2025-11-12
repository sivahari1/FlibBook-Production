import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { razorpay, SUBSCRIPTION_PLANS, SubscriptionTier } from '@/lib/razorpay';
import { sanitizeString } from '@/lib/sanitization';
import { logger } from '@/lib/logger';

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
    const { plan: planRaw } = body;
    
    // Sanitize input
    const plan = sanitizeString(planRaw);

    // Validate plan
    if (!plan || !['pro', 'enterprise'].includes(plan)) {
      return NextResponse.json(
        { error: 'Invalid subscription plan' },
        { status: 400 }
      );
    }

    const tier = plan as SubscriptionTier;
    const planDetails = SUBSCRIPTION_PLANS[tier];

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: planDetails.price, // Amount in paise
      currency: 'INR',
      receipt: `sub_${session.user.id}_${Date.now()}`,
      notes: {
        userId: session.user.id,
        plan: tier,
      },
    });

    logger.info('Razorpay order created', {
      userId: session.user.id,
      orderId: order.id,
      plan: tier,
      amount: order.amount
    });

    return NextResponse.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    logger.error('Error creating Razorpay order', error);
    return NextResponse.json(
      { error: 'Failed to create order' },
      { status: 500 }
    );
  }
}
