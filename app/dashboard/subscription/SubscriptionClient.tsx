'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PlanCard from '@/components/subscription/PlanCard';
import RazorpayButton from '@/components/subscription/RazorpayButton';
import { Card } from '@/components/ui/Card';

interface ActiveSubscription {
  id: string;
  plan: string;
  status: string;
  startDate: Date;
  endDate: Date;
}

interface SubscriptionClientProps {
  currentPlan: string;
  activeSubscription: ActiveSubscription | null;
}

const PLANS = [
  {
    id: 'free',
    name: 'Free Trial',
    price: 0,
    duration: 'Forever',
    storage: '100 MB',
    maxDocuments: 'Up to 5',
    features: [
      'Basic DRM protection',
      'Dynamic watermarking',
      'Share link generation',
      'Basic analytics',
    ],
    popular: false,
  },
  {
    id: 'monthly',
    name: '1 Month Plan',
    price: 250000, // ₹2,500 in paise
    duration: '30 days',
    storage: '10 GB',
    maxDocuments: 'Unlimited',
    features: [
      'All Free features',
      'Advanced analytics',
      'Priority support',
      'Custom watermarks',
      'Password protection',
    ],
    popular: false,
  },
  {
    id: 'quarterly',
    name: '3 Months Plan',
    price: 600000, // ₹6,000 in paise
    duration: '90 days',
    storage: '10 GB',
    maxDocuments: 'Unlimited',
    features: [
      'All Free features',
      'Advanced analytics',
      'Priority support',
      'Custom watermarks',
      'Password protection',
      'Save ₹1,500',
    ],
    popular: true,
  },
  {
    id: 'halfYearly',
    name: '6 Months Plan',
    price: 1000000, // ₹10,000 in paise
    duration: '180 days',
    storage: '10 GB',
    maxDocuments: 'Unlimited',
    features: [
      'All Free features',
      'Advanced analytics',
      'Priority support',
      'Custom watermarks',
      'Password protection',
      'Save ₹5,000',
    ],
    popular: false,
  },
  {
    id: 'yearly',
    name: '1 Year Plan',
    price: 1800000, // ₹18,000 in paise
    duration: '365 days',
    storage: '10 GB',
    maxDocuments: 'Unlimited',
    features: [
      'All Free features',
      'Advanced analytics',
      'Priority support',
      'Custom watermarks',
      'Password protection',
      'Save ₹12,000',
      'Best Value!',
    ],
    popular: false,
  },
];

export default function SubscriptionClient({
  currentPlan,
  activeSubscription,
}: SubscriptionClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleUpgrade = async (plan: 'monthly' | 'quarterly' | 'halfYearly' | 'yearly') => {
    setLoading(plan);
    setError(null);
    setSuccess(null);

    try {
      // Create order
      const orderResponse = await fetch('/api/subscription/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const orderData = await orderResponse.json();

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        const script = document.createElement('script');
        script.src = 'https://checkout.razorpay.com/v1/checkout.js';
        script.async = true;
        document.body.appendChild(script);

        await new Promise((resolve, reject) => {
          script.onload = resolve;
          script.onerror = reject;
        });
      }

      // Configure Razorpay options
      const options = {
        key: orderData.keyId,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'FlipBook DRM',
        description: `${plan.charAt(0).toUpperCase() + plan.slice(1)} Subscription`,
        order_id: orderData.orderId,
        handler: async function (response: any) {
          try {
            // Verify payment
            const verifyResponse = await fetch('/api/subscription/verify-payment', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
              }),
            });

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || 'Payment verification failed');
            }

            setSuccess('Subscription activated successfully!');
            setTimeout(() => {
              router.refresh();
            }, 2000);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Payment verification failed');
          } finally {
            setLoading(null);
          }
        },
        prefill: {
          name: '',
          email: '',
        },
        theme: {
          color: '#3b82f6',
        },
        modal: {
          ondismiss: function () {
            setLoading(null);
          },
        },
      };

      // Open Razorpay checkout
      const razorpay = new window.Razorpay(options);
      razorpay.open();
    } catch (err) {
      setLoading(null);
      setError(err instanceof Error ? err.message : 'Failed to initiate payment');
    }
  };

  return (
    <div className="space-y-8">
      {/* Current Subscription Status */}
      {activeSubscription && (
        <Card>
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Current Subscription</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-gray-600">Plan</p>
                <p className="text-lg font-semibold capitalize">{activeSubscription.plan}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Status</p>
                <p className="text-lg font-semibold capitalize">{activeSubscription.status}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Expires On</p>
                <p className="text-lg font-semibold">
                  {new Date(activeSubscription.endDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Success/Error Messages */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded">
          {success}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            name={plan.name}
            price={plan.price}
            duration={plan.duration}
            storage={plan.storage}
            maxDocuments={plan.maxDocuments}
            features={plan.features}
            isCurrentPlan={currentPlan === plan.id}
            popular={plan.popular}
            onUpgrade={
              plan.id !== 'free' && plan.id !== currentPlan
                ? () => handleUpgrade(plan.id as 'monthly' | 'quarterly' | 'halfYearly' | 'yearly')
                : undefined
            }
            loading={loading === plan.id}
          />
        ))}
      </div>
    </div>
  );
}
