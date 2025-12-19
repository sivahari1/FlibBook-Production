'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmailSentMessage } from '@/components/ui/EmailSentMessage';
import { useToast } from '@/components/ui/Toast';

export const ForgotPasswordForm: React.FC = () => {
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      setError('Email is required');
      return false;
    }
    if (!emailRegex.test(email)) {
      setError('Invalid email format');
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.message || 'Failed to send reset email';
        setError(errorMsg);
        showToast('error', errorMsg);
        return;
      }

      setIsSuccess(true);
      showToast('success', 'Password reset email sent! Please check your inbox.');
    } catch (error) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) {
      setError('');
    }
  };

  if (isSuccess) {
    return (
      <div className="space-y-4">
        <EmailSentMessage
          email={email}
          message="If an account exists for"
          additionalInfo="The link will expire in 1 hour."
        />

        <div className="text-center text-sm text-gray-600">
          <p>Didn&apos;t receive the email? Check your spam folder or try again in a few minutes.</p>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <Input
        label="Email"
        type="email"
        name="email"
        value={email}
        onChange={handleChange}
        error={error && !email ? error : ''}
        placeholder="Enter your email address"
        autoComplete="email"
        validateOnBlur
        onValidate={(value) => {
          if (!value) return 'Email is required';
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(value)) return 'Invalid email format';
          return undefined;
        }}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Send Reset Link
      </Button>
    </form>
  );
};
