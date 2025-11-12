import React from 'react';
import { VerifyClient } from './VerifyClient';

export default function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = React.use(searchParams);
  const token = params.token;

  return <VerifyClient token={token} />;
}
