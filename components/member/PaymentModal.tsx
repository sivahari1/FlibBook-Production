'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookShopItem: {
    id: string;
    title: string;
    description: string | null;
    category: string;
    price: number;
  };
  onSuccess: () => void;
}

interface RazorpayResponse {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}

interface RazorpayError {
  reason?: string;
  description?: string;
}

interface RazorpayOptions {
  key: string | undefined;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  handler: (response: RazorpayResponse) => Promise<void>;
  modal: {
    ondismiss: () => void;
    escape: boolean;
    animation: boolean;
  };
  theme: {
    color: string;
  };
  retry: {
    enabled: boolean;
    max_count: number;
  };
}

interface RazorpayInstance {
  open: () => void;
  on: (event: string, handler: (response: { error: RazorpayError }) => void) => void;
}

declare global {
  interface Window {
    Razorpay: new (options: RazorpayOptions) => RazorpayInstance;
  }
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  isOpen,
  onClose,
  bookShopItem,
  onSuccess,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'ready' | 'processing' | 'verifying' | 'failed'>('ready');

  const handlePayment = async () => {
    try {
      setIsProcessing(true);
      setError(null);
      setPaymentStep('processing');

      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bookShopItemId: bookShopItem.id,
        }),
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        
        // Handle specific error cases
        if (orderResponse.status === 400 && errorData.error?.includes('limit')) {
          throw new Error('Paid item limit reached (5/5). Remove an item from your Study Room to purchase more.');
        } else if (orderResponse.status === 409) {
          throw new Error('You already own this item.');
        } else {
          throw new Error(errorData.error || 'Failed to create payment order. Please try again.');
        }
      }

      const orderData = await orderResponse.json();

      // Load Razorpay script if not already loaded
      if (!window.Razorpay) {
        try {
          const script = document.createElement('script');
          script.src = 'https://checkout.razorpay.com/v1/checkout.js';
          script.async = true;
          document.body.appendChild(script);
          
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load payment gateway. Please check your internet connection.'));
            setTimeout(() => reject(new Error('Payment gateway loading timeout')), 10000);
          });
        } catch (scriptError) {
          throw new Error('Unable to load payment gateway. Please refresh the page and try again.');
        }
      }

      // Initialize Razorpay checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'jstudyroom',
        description: bookShopItem.title,
        order_id: orderData.orderId,
        handler: async (response: RazorpayResponse) => {
          try {
            setPaymentStep('verifying');
            
            // Verify payment on server
            const verifyResponse = await fetch('/api/payment/verify', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                razorpayOrderId: response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
              }),
            });

            if (!verifyResponse.ok) {
              const errorData = await verifyResponse.json();
              throw new Error(errorData.error || 'Payment verification failed. Please contact support if amount was deducted.');
            }

            // Success!
            setIsProcessing(false);
            setPaymentStep('ready');
            onSuccess();
            onClose();
          } catch (error) {
            setIsProcessing(false);
            setPaymentStep('failed');
            const errorMessage = error instanceof Error ? error.message : 'Payment verification failed';
            setError(errorMessage);
            console.error('Payment verification error:', error);
          }
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false);
            setPaymentStep('ready');
            // User cancelled payment
            if (!error) {
              setError('Payment cancelled. You can try again when ready.');
            }
          },
          escape: true,
          animation: true,
        },
        theme: {
          color: '#667eea',
        },
        retry: {
          enabled: true,
          max_count: 3,
        },
      };

      const razorpay = new window.Razorpay(options);
      
      razorpay.on('payment.failed', function (response: { error: RazorpayError }) {
        setIsProcessing(false);
        setPaymentStep('failed');
        const reason = response.error?.reason || response.error?.description || 'Payment failed';
        setError(`Payment failed: ${reason}. Please try again or use a different payment method.`);
        console.error('Payment failed:', response.error);
      });
      
      razorpay.open();
    } catch (error) {
      setIsProcessing(false);
      setPaymentStep('failed');
      const errorMessage = error instanceof Error ? error.message : 'Failed to initiate payment';
      setError(errorMessage);
      console.error('Payment initiation error:', error);
    }
  };

  const handleRetry = () => {
    setError(null);
    setPaymentStep('ready');
    handlePayment();
  };

  const priceInRupees = (bookShopItem.price / 100).toFixed(2);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Purchase Document" size="md">
      <div className="space-y-4">
        {/* Document Details */}
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
          <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
            {bookShopItem.title}
          </h3>
          {bookShopItem.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {bookShopItem.description}
            </p>
          )}
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              Category: {bookShopItem.category}
            </span>
            <span className="text-2xl font-bold text-green-600 dark:text-green-400">
              ₹{priceInRupees}
            </span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start">
            <svg
              className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div className="text-sm text-blue-800 dark:text-blue-300">
              <p className="font-semibold mb-1">What you'll get:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Instant access to the document</li>
                <li>Added to your My jstudyroom</li>
                <li>DRM-protected viewing</li>
                <li>Watermarked with your email</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Processing Status */}
        {paymentStep === 'verifying' && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="animate-spin w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Verifying Payment...</p>
                <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">Please wait while we confirm your payment.</p>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-start">
              <svg
                className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <p className="text-sm text-red-800 dark:text-red-300">{error}</p>
                {paymentStep === 'failed' && !error.includes('cancelled') && (
                  <button
                    onClick={handleRetry}
                    className="mt-2 text-xs text-red-700 dark:text-red-300 underline hover:no-underline"
                  >
                    Try payment again
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            onClick={onClose}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isProcessing ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                {paymentStep === 'verifying' ? 'Verifying...' : 'Processing...'}
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5 mr-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                Pay ₹{priceInRupees}
              </>
            )}
          </button>
        </div>

        {/* Security Note */}
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center pt-2">
          🔒 Secure payment powered by Razorpay
        </p>
      </div>
    </Modal>
  );
};
