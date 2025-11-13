import { redirect } from 'next/navigation';

/**
 * Redirect /share/[shareKey] to /view/[shareKey]
 * This provides backward compatibility for old share links
 */
export default async function ShareRedirectPage({
  params,
}: {
  params: Promise<{ shareKey: string }>;
}) {
  const { shareKey } = await params;
  redirect(`/view/${shareKey}`);
}
