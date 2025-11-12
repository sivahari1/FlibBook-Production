'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

interface VerifyClientProps {
  token?: string;
}

type VerificationState = 
  | { status: 'verifying' }
  | { status: 'success'; message: string }
  | { status: 'error'; code: string; message: string; action?: string };

export function VerifyClient({ token }: VerifyClientProps) {
  const router = useRouter();
  const [state, setState] = useState<VerificationState>({ status: 'verifying' });
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    // If no token provided, show error immediately
    if (!token) {
      setState({
        status: 'error',
        code: 'MISSING_TOKEN',
        message: 'No verification token provided',
        action: 'resend',
      });
      return;
    }

    // Verify the token
    const verifyEmail = async () => {
      try {
        const response = await fetch('/api/auth/verify-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setState({
            status: 'success',
            message: data.message || 'Email verified successfully!',
          });

          // Redirect to dashboard after 2 seconds
          setTimeout(() => {
            router.push(data.redirectUrl || '/dashboard');
            router.refresh();
          }, 2000);
        } else {
          // Handle error response
          const error = data.error || {};
          setState({
            status: 'error',
            code: error.code || 'VERIFICATION_FAILED',
            message: error.message || 'Failed to verify email',
            action: error.action,
          });
        }
      } catch (error) {
        setState({
          status: 'error',
          code: 'NETWORK_ERROR',
          message: 'An unexpected error occurred. Please try again.',
          action: 'resend',
        });
      }
    };

    verifyEmail();
  }, [token, router]);

  const handleResendVerification = async () => {
    setIsResending(true);
    setResendMessage(null);

    try {
      // We need to get the email from somewhere - for now, redirect to verify-email page
      // where they can resend from their account
      router.push('/verify-email');
    } catch (error) {
      setResendMessage({
        type: 'error',
        text: 'Failed to redirect. Please try again.',
      });
      setIsResending(false);
    }
  };

  const handleGoToLogin = () => {
    router.push('/login');
  };

  // Verifying state
  if (state.status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FlipBook DRM
            </h1>
            <p className="mt-2 text-gray-600">Verifying your email</p>
          </div>

          <Card className="shadow-xl">
            <CardContent className="pt-6">
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                <p className="text-gray-600">Verifying your email address...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success state
  if (state.status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FlipBook DRM
            </h1>
            <p className="mt-2 text-gray-600">Email Verified</p>
          </div>

          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-center mb-4">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <svg 
                    className="w-8 h-8 text-green-600" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M5 13l4 4L19 7" 
                    />
                  </svg>
                </div>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 text-center">
                Email Verified Successfully!
              </h2>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
                  <p className="text-sm text-green-900">
                    {state.message}
                  </p>
                </div>

                <div className="text-sm text-gray-600 text-center">
                  <p>Redirecting you to the dashboard...</p>
                </div>

                <div className="pt-4">
                  <Button
                    onClick={() => router.push('/dashboard')}
                    variant="primary"
                    size="lg"
                    className="w-full"
                  >
                    Go to Dashboard
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FlipBook DRM
          </h1>
          <p className="mt-2 text-gray-600">Email Verification</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-red-600" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M6 18L18 6M6 6l12 12" 
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 text-center">
              Verification Failed
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                <p className="text-sm font-semibold text-red-900 mb-1">
                  {state.code === 'TOKEN_EXPIRED' && 'Link Expired'}
                  {state.code === 'INVALID_TOKEN' && 'Invalid Link'}
                  {state.code === 'MISSING_TOKEN' && 'Missing Token'}
                  {!['TOKEN_EXPIRED', 'INVALID_TOKEN', 'MISSING_TOKEN'].includes(state.code) && 'Verification Error'}
                </p>
                <p className="text-sm text-red-800">
                  {state.message}
                </p>
              </div>

              {state.code === 'TOKEN_EXPIRED' && (
                <div className="text-sm text-gray-600">
                  <p>
                    Your verification link has expired. Verification links are valid for 24 hours.
                  </p>
                  <p className="mt-2">
                    Please request a new verification email to continue.
                  </p>
                </div>
              )}

              {state.code === 'INVALID_TOKEN' && (
                <div className="text-sm text-gray-600">
                  <p>
                    The verification link is invalid or has already been used.
                  </p>
                  <p className="mt-2">
                    If you need a new verification email, please use the button below.
                  </p>
                </div>
              )}

              {state.code === 'MISSING_TOKEN' && (
                <div className="text-sm text-gray-600">
                  <p>
                    The verification link appears to be incomplete.
                  </p>
                  <p className="mt-2">
                    Please check your email and click the complete verification link, or request a new one.
                  </p>
                </div>
              )}

              {resendMessage && (
                <div 
                  className={`p-3 rounded-lg text-sm ${
                    resendMessage.type === 'success' 
                      ? 'bg-green-50 border border-green-200 text-green-700' 
                      : 'bg-red-50 border border-red-200 text-red-700'
                  }`}
                >
                  {resendMessage.text}
                </div>
              )}

              <div className="pt-4 space-y-3">
                {state.action === 'resend' && (
                  <Button
                    onClick={handleResendVerification}
                    variant="primary"
                    size="lg"
                    isLoading={isResending}
                    className="w-full"
                  >
                    Request New Verification Email
                  </Button>
                )}

                <Button
                  onClick={handleGoToLogin}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  Go to Login
                </Button>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <p className="text-xs text-gray-500 text-center">
                  Need help? Contact support for assistance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
