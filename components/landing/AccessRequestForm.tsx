'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, User, FileText, Users, MessageSquare, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

type RequestedRole = 'PLATFORM_USER' | 'READER_USER' | '';

interface FormData {
  email: string;
  name: string;
  purpose: string;
  numDocuments: string;
  numUsers: string;
  requestedRole: RequestedRole;
  extraMessage: string;
}

interface FormErrors {
  email?: string;
  purpose?: string;
}

export default function AccessRequestForm() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    name: '',
    purpose: '',
    numDocuments: '',
    numUsers: '',
    requestedRole: '',
    extraMessage: ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Purpose validation
    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Please describe why you need access';
    } else if (formData.purpose.trim().length < 10) {
      newErrors.purpose = 'Please provide at least 10 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus('idle');
    setErrorMessage('');

    try {
      const payload = {
        email: formData.email.trim(),
        name: formData.name.trim() || undefined,
        purpose: formData.purpose.trim(),
        numDocuments: formData.numDocuments ? parseInt(formData.numDocuments) : undefined,
        numUsers: formData.numUsers ? parseInt(formData.numUsers) : undefined,
        requestedRole: formData.requestedRole || undefined,
        extraMessage: formData.extraMessage.trim() || undefined
      };

      const response = await fetch('/api/access-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('Too many requests. Please try again later.');
        }
        throw new Error(data.message || 'Failed to submit request');
      }

      setSubmitStatus('success');
      // Reset form
      setFormData({
        email: '',
        name: '',
        purpose: '',
        numDocuments: '',
        numUsers: '',
        requestedRole: '',
        extraMessage: ''
      });
    } catch (error) {
      setSubmitStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error for this field when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  if (submitStatus === 'success') {
    return (
      <section id="request-access" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-2xl p-12 text-center animate-scaleIn">
          <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-white" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            Platform User Request Submitted!
          </h3>
          <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
            Thank you for your interest in becoming a Platform User. We've received your access request and our admin team will review it shortly.
          </p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You'll receive an email at <strong className="text-gray-900 dark:text-white">{formData.email}</strong> once your request is approved with your login credentials.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
            Need immediate access to shared documents?{' '}
            <Link href="/register" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
              Register as a Member
            </Link>
            {' '}instead for instant access.
          </p>
          <button
            onClick={() => setSubmitStatus('idle')}
            className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
          >
            Submit another request
          </button>
        </div>
      </section>
    );
  }

  return (
    <section id="request-access" className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-8 md:p-12">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-4 py-2 rounded-full text-sm font-medium mb-4">
            <Users className="w-4 h-4" />
            <span>For Platform Users Only</span>
          </div>
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900 dark:text-white">
            Request Platform User Access
          </h2>
          <p className="text-lg text-gray-600 dark:text-gray-300 mb-4">
            Platform Users can upload, manage, and share protected documents with full control.
          </p>
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-left">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              <strong className="text-gray-900 dark:text-white">Approval Process:</strong>
            </p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-1 list-decimal list-inside">
              <li>Submit your access request with details about your use case</li>
              <li>Our admin team will review your request (typically within 24-48 hours)</li>
              <li>If approved, you'll receive an email with your login credentials</li>
              <li>Log in and start uploading and sharing documents immediately</li>
            </ol>
          </div>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
            Looking to access shared documents instead?{' '}
            <Link href="/register" className="text-purple-600 dark:text-purple-400 hover:underline font-medium">
              Register as a Member
            </Link>
            {' '}for instant access.
          </p>
        </div>

        {submitStatus === 'error' && (
          <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-500 rounded-lg p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-800 dark:text-red-200 font-medium">Failed to submit request</p>
              <p className="text-red-700 dark:text-red-300 text-sm mt-1">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Email - Required */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                id="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={`w-full pl-11 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white ${
                  errors.email ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                }`}
                placeholder="your.email@example.com"
                disabled={isSubmitting}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email}</p>
            )}
          </div>

          {/* Name - Optional */}
          <div>
            <label htmlFor="name" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                id="name"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                placeholder="John Doe"
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Purpose - Required */}
          <div>
            <label htmlFor="purpose" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Why do you need access? <span className="text-red-500">*</span>
            </label>
            <textarea
              id="purpose"
              value={formData.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              rows={4}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none ${
                errors.purpose ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
              }`}
              placeholder="Describe your use case, what type of documents you'll be sharing, and who your audience is..."
              disabled={isSubmitting}
            />
            {errors.purpose && (
              <p className="mt-1 text-sm text-red-500">{errors.purpose}</p>
            )}
          </div>

          {/* Number of Documents - Optional */}
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="numDocuments" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Estimated Documents
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  id="numDocuments"
                  value={formData.numDocuments}
                  onChange={(e) => handleChange('numDocuments', e.target.value)}
                  min="0"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="e.g., 50"
                  disabled={isSubmitting}
                />
              </div>
            </div>

            {/* Number of Users - Optional */}
            <div>
              <label htmlFor="numUsers" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
                Estimated Users
              </label>
              <div className="relative">
                <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="number"
                  id="numUsers"
                  value={formData.numUsers}
                  onChange={(e) => handleChange('numUsers', e.target.value)}
                  min="0"
                  className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  placeholder="e.g., 10"
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Requested Role - Optional */}
          <div>
            <label htmlFor="requestedRole" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Desired Platform User Type
            </label>
            <select
              id="requestedRole"
              value={formData.requestedRole}
              onChange={(e) => handleChange('requestedRole', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              disabled={isSubmitting}
            >
              <option value="">Select user type (optional)</option>
              <option value="PLATFORM_USER">Platform User - Upload & share documents (most common)</option>
              <option value="READER_USER">Reader User - View shared documents only (legacy)</option>
            </select>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Note: For general document viewing, consider{' '}
              <Link href="/register" className="text-purple-600 dark:text-purple-400 hover:underline">
                registering as a Member
              </Link>
              {' '}instead.
            </p>
          </div>

          {/* Extra Message - Optional */}
          <div>
            <label htmlFor="extraMessage" className="block text-sm font-semibold text-gray-900 dark:text-white mb-2">
              Additional Information
            </label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
              <textarea
                id="extraMessage"
                value={formData.extraMessage}
                onChange={(e) => handleChange('extraMessage', e.target.value)}
                rows={3}
                className="w-full pl-11 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                placeholder="Budget constraints, timeline, special requirements, etc."
                disabled={isSubmitting}
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Access Request'
            )}
          </button>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
            By submitting this form, you agree to be contacted regarding your access request.
          </p>
        </form>
      </div>
    </section>
  );
}
