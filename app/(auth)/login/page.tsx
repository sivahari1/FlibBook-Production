import React from 'react';
import Link from 'next/link';
import { LoginForm } from '@/components/auth/LoginForm';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string; callbackUrl?: string; reset?: string }>;
}) {
  const params = React.use(searchParams);
  const showSignupMessage = params.message === 'signup';
  const showResetSuccess = params.reset === 'success';
  const callbackUrl = params.callbackUrl;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            jStudyRoom
          </h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Welcome back</p>
        </div>

        {showResetSuccess && (
          <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-l-4 border-green-500 p-4 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-1">
                  Password Reset Successful
                </h3>
                <p className="text-sm text-green-800 dark:text-green-200">
                  Your password has been reset. You can now login with your new password.
                </p>
              </div>
            </div>
          </div>
        )}

        {showSignupMessage && (
          <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Account Required
                </h3>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  To view this shared document, please login or create a free account. It only takes a minute!
                </p>
              </div>
            </div>
          </div>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Login</h2>
          </CardHeader>
          <CardContent>
            <LoginForm />
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Don't have an account?{' '}
                <Link 
                  href="/#request-access"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                >
                  Request Access
                </Link>
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                New users must request access from the administrator
              </p>
            </div>
          </CardContent>
        </Card>

        {showSignupMessage && (
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500">
              ✨ Free accounts include 100MB storage and 5 documents
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
