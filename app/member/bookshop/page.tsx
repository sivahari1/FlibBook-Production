import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { BookShop } from '@/components/member/BookShop';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function BookShopPage() {
  const session = await getServerSession(authOptions);

  // Verify authentication
  if (!session) {
    redirect('/login');
  }

  // Allow ADMIN users to access member bookshop for testing and verification
  // Redirect non-member, non-admin users to their appropriate dashboards
  if (session.user?.userRole !== 'MEMBER' && session.user?.userRole !== 'ADMIN') {
    if (session.user?.userRole === 'PLATFORM_USER') {
      redirect('/dashboard');
    } else if (session.user?.userRole === 'READER_USER') {
      redirect('/reader');
    } else {
      redirect('/login');
    }
  }

  return <BookShop />;
}
