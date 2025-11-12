import React from 'react';
import Link from 'next/link';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';

export default function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const params = React.use(searchParams);
  const callbackUrl = params.callbackUrl;
  const isFromShareLink = callbackUrl?.includes('/view/');

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            FlipBook DRM
          </h1>
          <p className="mt-2 text-gray-600">
            {isFromShareLink ? 'Create your free account to view the document' : 'Create your account'}
          </p>
        </div>

        {isFromShareLink && (
          <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-r-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <h3 className="text-sm font-semibold text-green-900 mb-1">
                  Free Account Benefits
                </h3>
                <ul className="text-sm text-green-800 space-y-1">
                  <li>✓ View shared documents securely</li>
                  <li>✓ 100MB storage for your own documents</li>
                  <li>✓ Upload up to 5 documents</li>
                  <li>✓ Create secure share links</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <Card className="shadow-xl">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900">Register</h2>
          </CardHeader>
          <CardContent>
            <RegisterForm />
            
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link 
                  href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : '/login'}
                  className="text-blue-600 hover:text-blue-700 font-medium"
                >
                  Login here
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
