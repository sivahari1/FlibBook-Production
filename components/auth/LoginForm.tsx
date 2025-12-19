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
          const errorMsg = `Access Denied: You don&apos;t have permission to access this dashboard. Your role is ${userRole.replace('_', ' ')}`;
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


    </div>
  );
};
