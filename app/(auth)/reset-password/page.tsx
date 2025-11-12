import React from 'react';
import Link from 'next/link';
import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = React.use(searchParams);
  const token = params.token;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FlipBook DRM
          </h1>
          <p className="mt-2 text-gray-600">Create a new password</p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Reset Password</h2>
            <p className="text-sm text-gray-600 mt-2">
              Enter your new password below.
            </p>
          </CardHeader>
          <CardContent>
            <ResetPasswordForm token={token} />
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Remember your password?{' '}
                <Link 
                  href="/login"
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Back to login
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
