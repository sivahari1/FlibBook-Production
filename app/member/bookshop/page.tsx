import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { BookShop } from '@/components/member/BookShop';

export default async function BookShopPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect('/login');
  }

  if (session.user.role !== 'MEMBER') {
    redirect('/dashboard');
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <BookShop />
    </div>
  );
}
