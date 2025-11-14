'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordStrengthIndicator, PasswordStrength } from '@/components/ui/PasswordStrengthIndicator';
import { TokenExpiredMessage } from '@/components/ui/TokenExpiredMessage';
import { EmailSentMessage } from '@/components/ui/EmailSentMessage';
import { useToast } from '@/components/ui/Toast';

interface ResetPasswordFormProps {
  token?: string;
}

export const ResetPasswordForm: React.FC<ResetPasswordFormProps> = ({ token }) => {
  const router = useRouter();
  const { showToast } = useToast();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [tokenError, setTokenError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  useEffect(() => {
    if (!token) {
      setTokenError('Invalid or missing reset token');
    }
  }, [token]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength && !passwordStrength.checks.uppercase) {
      newErrors.password = 'Password must contain at least one uppercase letter';
    } else if (passwordStrength && !passwordStrength.checks.lowercase) {
      newErrors.password = 'Password must contain at least one lowercase letter';
    } else if (passwordStrength && !passwordStrength.checks.number) {
      newErrors.password = 'Password must contain at least one number';
    } else if (passwordStrength && !passwordStrength.checks.special) {
      newErrors.password = 'Password must contain at least one special character';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setTokenError('Invalid or missing reset token');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 400 && data.message?.includes('expired')) {
          setTokenError(data.message);
          showToast('error', 'Your reset link has expired. Please request a new one.');
        } else if (response.status === 400 && data.message?.includes('invalid')) {
          setTokenError(data.message);
          showToast('error', 'Invalid reset link. Please request a new one.');
        } else {
          setErrors({ password: data.message || 'Failed to reset password' });
          showToast('error', data.message || 'Failed to reset password');
        }
        return;
      }

      setIsSuccess(true);
      showToast('success', 'Password reset successful! Redirecting to login...');
      
      // Redirect to login with success parameter after 2 seconds
      setTimeout(() => {
        router.push('/login?reset=success');
      }, 2000);
    } catch (error) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setErrors({ password: errorMsg });
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    if (errors.password) {
      setErrors(prev => ({ ...prev, password: '' }));
    }
  };

  const handleConfirmPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setConfirmPassword(e.target.value);
    if (errors.confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: '' }));
    }
  };

  if (tokenError) {
    return (
      <TokenExpiredMessage
        message={tokenError}
        additionalInfo="Please request a new password reset link."
        actionLabel="Request New Reset Link"
        onAction={() => router.push('/forgot-password')}
      />
    );
  }

  if (isSuccess) {
    return (
      <EmailSentMessage
        email=""
        title="Password Reset Successful"
        message="Your password has been successfully reset. Redirecting to login..."
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        label="New Password"
        type="password"
        name="password"
        value={password}
        onChange={handlePasswordChange}
        error={errors.password}
        placeholder="Enter your new password"
        autoComplete="new-password"
      />

      <PasswordStrengthIndicator
        password={password}
        onStrengthChange={setPasswordStrength}
      />

      <Input
        label="Confirm Password"
        type="password"
        name="confirmPassword"
        value={confirmPassword}
        onChange={handleConfirmPasswordChange}
        error={errors.confirmPassword}
        placeholder="Confirm your new password"
        autoComplete="new-password"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Reset Password
      </Button>
    </form>
  );
};
