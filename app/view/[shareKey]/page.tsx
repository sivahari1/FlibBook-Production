import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ViewerClient from './ViewerClient';

export default async function ViewerPage({
  params,
}: {
  params: Promise<{ shareKey: string }>;
}) {
  const session = await getServerSession(authOptions);
  const { shareKey } = await params;

  // Require authentication to view shared documents
  if (!session?.user) {
    // Redirect to login with callback to return to this share link
    redirect(`/login?callbackUrl=/view/${shareKey}&message=signup`);
  }

  return <ViewerClient shareKey={shareKey} userEmail={session.user.email || ''} />;
}
