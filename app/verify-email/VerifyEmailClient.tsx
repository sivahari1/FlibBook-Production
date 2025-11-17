'use client';

import React, { useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

interface VerifyEmailClientProps {
  email: string;
}

export function VerifyEmailClient({ email }: VerifyEmailClientProps) {
  const router = useRouter();
  const { update } = useSession();
  const [isResending, setIsResending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [cooldown, setCooldown] = useState(0);

  const handleResendEmail = async () => {
    if (cooldown > 0) return;

    setIsResending(true);
    setMessage(null);

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ type: 'success', text: data.message || 'Verification email sent! Please check your inbox.' });
        
        // Start 60-second cooldown
        setCooldown(60);
        const interval = setInterval(() => {
          setCooldown((prev) => {
            if (prev <= 1) {
              clearInterval(interval);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      } else {
        setMessage({ 
          type: 'error', 
          text: data.error || 'Failed to send verification email. Please try again.' 
        });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: 'An unexpected error occurred. Please try again.' 
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  // Poll for verification status
  React.useEffect(() => {
    const checkVerification = async () => {
      try {
        // Update the session to get latest emailVerified status
        const updatedSession = await update();
        
        if (updatedSession?.user?.emailVerified) {
          router.push('/dashboard');
          router.refresh();
        }
      } catch (error) {
        // Silently fail - user can manually refresh
      }
    };

    // Check every 5 seconds
    const interval = setInterval(checkVerification, 5000);
    
    return () => clearInterval(interval);
  }, [update, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            jstudyroom
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Email Verification Required</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <div className="flex items-center justify-center mb-4">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
                <svg 
                  className="w-8 h-8 text-blue-600 dark:text-blue-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" 
                  />
                </svg>
              </div>
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100 text-center">
              Verify Your Email
            </h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  We've sent a verification email to:
                </p>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-1">
                  {email}
                </p>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-2">
                <p>
                  Please check your inbox and click the verification link to activate your account.
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Don't forget to check your spam folder if you don't see the email.
                </p>
              </div>

              {message && (
                <div 
                  className={`p-3 rounded-lg text-sm ${
                    message.type === 'success' 
                      ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-300' 
                      : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
                  }`}
                >
                  {message.text}
                </div>
              )}

              <div className="pt-4 space-y-3">
                <Button
                  onClick={handleResendEmail}
                  variant="primary"
                  size="lg"
                  isLoading={isResending}
                  disabled={cooldown > 0}
                  className="w-full"
                >
                  {cooldown > 0 
                    ? `Resend in ${cooldown}s` 
                    : 'Resend Verification Email'
                  }
                </Button>

                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  size="lg"
                  className="w-full"
                >
                  Logout
                </Button>
              </div>

              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                  This page will automatically redirect once your email is verified.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
