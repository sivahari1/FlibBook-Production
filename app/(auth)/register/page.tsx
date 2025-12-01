import React from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { RegisterForm } from '@/components/auth/RegisterForm';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              jStudyRoom
            </h1>
          </Link>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Create your Member account
          </p>
        </div>

        <Card className="shadow-xl">
          <CardHeader>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Member Registration</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              Register as a Member to access shared documents and the Book Shop
            </p>
          </CardHeader>
          <CardContent>
            <RegisterForm />

            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <div className="bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-500 p-4 rounded-r-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Need Platform User Access?
                    </h3>
                    <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                      Platform Users can upload and share documents. This requires admin approval.
                    </p>
                    <Link 
                      href="/#request-access"
                      className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium underline"
                    >
                      Request Platform User Access →
                    </Link>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center mt-6">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{' '}
                <Link 
                  href="/login"
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
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
