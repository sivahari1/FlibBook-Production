'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

interface LoginFormProps {
  showRoleButtons?: boolean;
}

export const LoginForm: React.FC<LoginFormProps> = ({ showRoleButtons = true }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format';
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        const errorMsg = 'Invalid email or password';
        setServerError(errorMsg);
        showToast('error', errorMsg);
        return;
      }

      if (result?.ok) {
        showToast('success', 'Login successful! Redirecting...');
        
        // Get session to determine redirect based on role
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        
        // Role-based redirect
        if (session?.user?.userRole === 'ADMIN') {
          router.push('/admin');
        } else if (session?.user?.userRole === 'PLATFORM_USER') {
          router.push('/dashboard');
        } else if (session?.user?.userRole === 'MEMBER') {
          router.push('/member');
        } else if (session?.user?.userRole === 'READER_USER') {
          router.push('/reader');
        } else {
          // Fallback to dashboard
          router.push('/dashboard');
        }
        
        router.refresh();
      }
    } catch (error) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setServerError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error for this field when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleRoleLogin = async (targetDashboard: string) => {
    setServerError('');

    // Validate form first
    if (!validateForm()) {
      showToast('error', 'Please enter your email and password');
      return;
    }

    setIsLoading(true);

    try {
      // Attempt login
      const result = await signIn('credentials', {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        const errorMsg = 'Invalid email or password';
        setServerError(errorMsg);
        showToast('error', errorMsg);
        return;
      }

      if (result?.ok) {
        // Get session to check user role
        const response = await fetch('/api/auth/session');
        const session = await response.json();
        const userRole = session?.user?.userRole;

        // ADMIN users can access ANY dashboard for testing and verification
        if (userRole === 'ADMIN') {
          showToast('success', 'Login successful! Redirecting...');
          router.push(targetDashboard);
          router.refresh();
          return;
        }

        // For non-admin users, enforce strict role matching
        const roleToPath: Record<string, string> = {
          'PLATFORM_USER': '/dashboard',
          'MEMBER': '/member',
          'READER_USER': '/reader',
        };

        const userDashboard = roleToPath[userRole];

        if (targetDashboard === userDashboard) {
          // User clicked their correct role
          showToast('success', 'Login successful! Redirecting...');
          router.push(targetDashboard);
          router.refresh();
        } else {
          // User clicked wrong role - show error and redirect
          const errorMsg = `Access Denied: You don't have permission to access this dashboard. Your role is ${userRole.replace('_', ' ')}`;
          setServerError(errorMsg);
          showToast('error', errorMsg);
          
          // Redirect to their correct dashboard after showing error
          setTimeout(() => {
            router.push(userDashboard);
            router.refresh();
          }, 2000);
        }
      }
    } catch (error) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setServerError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        {serverError && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-400 text-sm">
            {serverError}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          name="email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          placeholder="Enter your email"
          autoComplete="email"
          validateOnBlur
          onValidate={(value) => {
            if (!value) return 'Email is required';
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) return 'Invalid email format';
            return undefined;
          }}
        />

        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          placeholder="Enter your password"
          autoComplete="current-password"
        />

        <div className="flex items-center justify-end mb-4">
          <a 
            href="/forgot-password" 
            className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 hover:underline"
          >
            Forgot Password?
          </a>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          isLoading={isLoading}
          className="w-full"
        >
          Login
        </Button>
      </form>

      {showRoleButtons && (
        <div className="space-y-3">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Login as
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-2">
            <button
              type="button"
              onClick={() => handleRoleLogin('/admin')}
              disabled={isLoading}
              className="p-3 bg-gradient-to-r from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-2 border-purple-200 dark:border-purple-700 rounded-lg hover:border-purple-300 dark:hover:border-purple-600 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-purple-900 dark:text-purple-100">Admin</p>
                  <p className="text-xs text-purple-700 dark:text-purple-300">Full system access</p>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => handleRoleLogin('/dashboard')}
              disabled={isLoading}
              className="p-3 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-2 border-blue-200 dark:border-blue-700 rounded-lg hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">jStudyRoom Platform User</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">Document management</p>
                </div>
              </div>
            </button>
            
            <button
              type="button"
              onClick={() => handleRoleLogin('/member')}
              disabled={isLoading}
              className="p-3 bg-gradient-to-r from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-2 border-green-200 dark:border-green-700 rounded-lg hover:border-green-300 dark:hover:border-green-600 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed text-left"
            >
              <div className="flex items-center">
                <svg className="w-5 h-5 mr-2 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-green-900 dark:text-green-100">jStudyRoom Member</p>
                  <p className="text-xs text-green-700 dark:text-green-300">BookShop access</p>
                </div>
              </div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
