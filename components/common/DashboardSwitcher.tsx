'use client';

import React, { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession } from 'next-auth/react';

type UserRole = 'ADMIN' | 'PLATFORM_USER' | 'MEMBER' | 'READER_USER';

interface DashboardOption {
  role: UserRole;
  path: string;
  label: string;
  icon: React.ReactNode;
  description: string;
}

export const DashboardSwitcher: React.FC = () => {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);

  if (!session?.user) return null;

  const userRole = session.user.userRole as UserRole;
  const additionalRoles = (session.user as any).additionalRoles as UserRole[] || [];
  
  // Combine primary role with additional roles
  const allRoles = [userRole, ...additionalRoles];
  
  // Only show switcher if user has multiple roles
  if (allRoles.length <= 1) return null;

  const dashboardOptions: DashboardOption[] = [
    {
      role: 'ADMIN',
      path: '/admin',
      label: 'Admin Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
        </svg>
      ),
      description: 'Full system access'
    },
    {
      role: 'PLATFORM_USER',
      path: '/dashboard',
      label: 'Platform Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      description: 'Document management'
    },
    {
      role: 'MEMBER',
      path: '/member',
      label: 'Member Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
      description: 'BookShop access'
    },
    {
      role: 'READER_USER',
      path: '/reader',
      label: 'Reader Dashboard',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
        </svg>
      ),
      description: 'View shared content'
    }
  ];

  // Filter options to only show roles the user has
  const availableOptions = dashboardOptions.filter(option => 
    allRoles.includes(option.role)
  );

  // Determine current dashboard
  const currentDashboard = availableOptions.find(option => 
    pathname.startsWith(option.path)
  );

  const handleSwitch = (path: string) => {
    setIsOpen(false);
    router.push(path);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        aria-label="Switch dashboard"
      >
        <div className="flex items-center space-x-2">
          {currentDashboard?.icon}
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
            {currentDashboard?.label || 'Dashboard'}
          </span>
        </div>
        <svg 
          className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-50">
            <div className="p-2">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                Switch Dashboard
              </div>
              {availableOptions.map((option) => {
                const isCurrent = pathname.startsWith(option.path);
                return (
                  <button
                    key={option.role}
                    onClick={() => handleSwitch(option.path)}
                    disabled={isCurrent}
                    className={`w-full flex items-start space-x-3 px-3 py-3 rounded-lg transition-colors ${
                      isCurrent
                        ? 'bg-blue-50 dark:bg-blue-900/20 cursor-default'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <div className={`mt-0.5 ${
                      isCurrent 
                        ? 'text-blue-600 dark:text-blue-400' 
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {option.icon}
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`text-sm font-medium ${
                        isCurrent
                          ? 'text-blue-900 dark:text-blue-100'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {option.label}
                        {isCurrent && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
                            (Current)
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {option.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
