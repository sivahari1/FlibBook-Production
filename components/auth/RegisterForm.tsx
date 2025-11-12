'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordStrengthIndicator, PasswordStrength } from '@/components/ui/PasswordStrengthIndicator';
import { EmailSentMessage } from '@/components/ui/EmailSentMessage';
import { useToast } from '@/components/ui/Toast';

export const RegisterForm: React.FC = () => {
  const router = useRouter();
  const { showToast } = useToast();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState('');
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState<PasswordStrength | null>(null);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

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
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    } else if (passwordStrength && passwordStrength.score < 4) {
      newErrors.password = 'Password is too weak. Please use a stronger password.';
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Registration failed';
        setServerError(errorMsg);
        showToast('error', errorMsg);
        return;
      }

      // Show success message with email verification instructions
      setRegistrationSuccess(true);
      setRegisteredEmail(data.email || formData.email);
      showToast('success', 'Registration successful! Please check your email to verify your account.');
    } catch (error) {
      const errorMsg = 'An unexpected error occurred. Please try again.';
      setServerError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    setIsResending(true);
    setServerError('');

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: registeredEmail,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || 'Failed to resend verification email';
        setServerError(errorMsg);
        showToast('error', errorMsg);
        return;
      }

      // Show success message
      showToast('success', 'Verification email sent! Please check your inbox.');
    } catch (error) {
      const errorMsg = 'Failed to resend verification email. Please try again.';
      setServerError(errorMsg);
      showToast('error', errorMsg);
    } finally {
      setIsResending(false);
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

  // Show success message after registration
  if (registrationSuccess) {
    return (
      <div className="space-y-4">
        <EmailSentMessage
          email={registeredEmail}
          title="Registration Successful!"
          message="We've sent a verification email to"
          additionalInfo="Please check your inbox and click the verification link to activate your account."
        />

        {serverError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {serverError}
          </div>
        )}

        <div className="space-y-3">
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleResendVerification}
            isLoading={isResending}
            className="w-full"
          >
            Resend Verification Email
          </Button>

          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => router.push('/login')}
            className="w-full"
          >
            Go to Login
          </Button>
        </div>

        <p className="text-sm text-gray-600 text-center">
          Didn't receive the email? Check your spam folder or click "Resend Verification Email" above.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {serverError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {serverError}
        </div>
      )}

      <Input
        label="Name"
        type="text"
        name="name"
        value={formData.name}
        onChange={handleChange}
        error={errors.name}
        placeholder="Enter your name"
        autoComplete="name"
        validateOnBlur
        onValidate={(value) => {
          if (!value.trim()) return 'Name is required';
          return undefined;
        }}
      />

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
        autoComplete="new-password"
      />

      <PasswordStrengthIndicator
        password={formData.password}
        onStrengthChange={setPasswordStrength}
      />

      <Input
        label="Confirm Password"
        type="password"
        name="confirmPassword"
        value={formData.confirmPassword}
        onChange={handleChange}
        error={errors.confirmPassword}
        placeholder="Confirm your password"
        autoComplete="new-password"
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        isLoading={isLoading}
        className="w-full"
      >
        Register
      </Button>
    </form>
  );
};
