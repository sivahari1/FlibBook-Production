import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { DashboardSelector } from '@/components/admin/DashboardSelector';

export default async function SelectDashboardPage() {
  const session = await getServerSession(authOptions);

  // Only admins can access this page
  if (!session || session.user.userRole !== 'ADMIN') {
    redirect('/login');
  }

  return <DashboardSelector />;
}
