'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';

interface DashboardOption {
  role: string;
  title: string;
  description: string;
  path: string;
  color: 'purple' | 'blue' | 'green';
  icon: React.ReactNode;
}

const dashboardOptions: DashboardOption[] = [
  {
    role: 'ADMIN',
    title: 'Admin Dashboard',
    description: 'Manage users, access requests, and system settings',
    path: '/admin',
    color: 'purple',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
  {
    role: 'PLATFORM_USER',
    title: 'Platform User Dashboard',
    description: 'Upload, manage, and share documents',
    path: '/dashboard',
    color: 'blue',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    role: 'MEMBER',
    title: 'Member Dashboard',
    description: 'Browse BookShop and access purchased content',
    path: '/member',
    color: 'green',
    icon: (
      <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
];

const colorClasses = {
  purple: {
    bg: 'from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20',
    border: 'border-purple-200 dark:border-purple-700',
    text: 'text-purple-900 dark:text-purple-100',
    subtext: 'text-purple-700 dark:text-purple-300',
    icon: 'text-purple-600 dark:text-purple-400',
    hover: 'hover:border-purple-300 dark:hover:border-purple-600',
  },
  blue: {
    bg: 'from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20',
    border: 'border-blue-200 dark:border-blue-700',
    text: 'text-blue-900 dark:text-blue-100',
    subtext: 'text-blue-700 dark:text-blue-300',
    icon: 'text-blue-600 dark:text-blue-400',
    hover: 'hover:border-blue-300 dark:hover:border-blue-600',
  },
  green: {
    bg: 'from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20',
    border: 'border-green-200 dark:border-green-700',
    text: 'text-green-900 dark:text-green-100',
    subtext: 'text-green-700 dark:text-green-300',
    icon: 'text-green-600 dark:text-green-400',
    hover: 'hover:border-green-300 dark:hover:border-green-600',
  },
};

export const DashboardSelector: React.FC = () => {
  const router = useRouter();

  const handleDashboardSelect = (path: string) => {
    router.push(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Select Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            As an admin, you have access to all dashboards
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {dashboardOptions.map((option) => {
            const colors = colorClasses[option.color];
            return (
              <button
                key={option.role}
                onClick={() => handleDashboardSelect(option.path)}
                className={`
                  p-6 bg-gradient-to-br ${colors.bg} 
                  border-2 ${colors.border} ${colors.hover}
                  rounded-xl transition-all duration-200
                  hover:shadow-lg hover:scale-105
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-${option.color}-500
                  text-left
                `}
              >
                <div className={`${colors.icon} mb-4`}>
                  {option.icon}
                </div>
                <h3 className={`text-xl font-bold ${colors.text} mb-2`}>
                  {option.title}
                </h3>
                <p className={`text-sm ${colors.subtext}`}>
                  {option.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-8 text-center">
          <Button
            variant="secondary"
            onClick={() => router.push('/admin')}
            className="mx-auto"
          >
            Go to Admin Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
};
