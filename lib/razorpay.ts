import Razorpay from 'razorpay';
import crypto from 'crypto';

// Initialize Razorpay client
export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

// Subscription plan configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    name: 'Free',
    storage: 100 * 1024 * 1024, // 100MB in bytes
    maxDocuments: 5,
    price: 0,
    duration: 0, // No expiration
  },
  monthly: {
    name: '1 Month',
    storage: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    maxDocuments: Infinity,
    price: 250000, // ₹2,500 in paise
    duration: 30, // 30 days
  },
  quarterly: {
    name: '3 Months',
    storage: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    maxDocuments: Infinity,
    price: 600000, // ₹6,000 in paise
    duration: 90, // 90 days
  },
  halfYearly: {
    name: '6 Months',
    storage: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    maxDocuments: Infinity,
    price: 1000000, // ₹10,000 in paise
    duration: 180, // 180 days
  },
  yearly: {
    name: '1 Year',
    storage: 10 * 1024 * 1024 * 1024, // 10GB in bytes
    maxDocuments: Infinity,
    price: 1800000, // ₹18,000 in paise
    duration: 365, // 365 days
  },
} as const;

export type SubscriptionTier = keyof typeof SUBSCRIPTION_PLANS;

/**
 * Verify Razorpay payment signature
 * @param orderId - Razorpay order ID
 * @param paymentId - Razorpay payment ID
 * @param signature - Razorpay signature
 * @returns boolean indicating if signature is valid
 */
export function verifyPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  try {
    const text = `${orderId}|${paymentId}`;
    const generated = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest('hex');
    
    return generated === signature;
  } catch (error) {
    console.error('Error verifying payment signature:', error);
    return false;
  }
}

/**
 * Get subscription plan details
 * @param tier - Subscription tier
 * @returns Plan configuration
 */
export function getPlanDetails(tier: SubscriptionTier) {
  return SUBSCRIPTION_PLANS[tier];
}
