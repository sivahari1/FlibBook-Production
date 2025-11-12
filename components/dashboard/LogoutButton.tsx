'use client';

import { signOut } from 'next-auth/react';

export default function LogoutButton() {
  const handleLogout = async () => {
    await signOut({ callbackUrl: '/' });
  };

  return (
    <button
      onClick={handleLogout}
      className="text-sm text-gray-700 hover:text-red-600 font-medium transition-colors"
    >
      Logout
    </button>
  );
}
