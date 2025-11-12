import React from 'react';
import { VerifyEmailClient } from './VerifyEmailClient';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function VerifyEmailPage() {
  const session = await getServerSession(authOptions);

  // Redirect to login if not authenticated
  if (!session) {
    redirect('/login');
  }

  // Redirect to dashboard if already verified
  if (session.user.emailVerified) {
    redirect('/dashboard');
  }

  return <VerifyEmailClient email={session.user.email} />;
}
