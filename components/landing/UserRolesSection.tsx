'use client';

import Link from 'next/link';
import { Rocket, BookOpen, Shield, ArrowRight } from 'lucide-react';

export default function UserRolesSection() {
  const roles = [
    {
      icon: Rocket,
      title: 'Platform Users',
      description: 'Upload, manage, and share protected documents with full control',
      color: 'from-blue-500 to-cyan-500',
      badge: 'Requires Approval',
      link: '/roles/platform-user'
    },
    {
      icon: BookOpen,
      title: 'Members',
      description: 'Access shared documents, browse Book Shop, build your library',
      color: 'from-purple-500 to-pink-500',
      badge: 'Register Now',
      link: '/roles/member'
    },
    {
      icon: Shield,
      title: 'Admins',
      description: 'Manage users, curate BookShop, oversee platform operations',
      color: 'from-pink-500 to-rose-500',
      badge: 'By Invitation',
      link: '/roles/admin'
    }
  ];

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
      <div className="text-center mb-12 animate-fadeIn">
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-4">
          Three Access Levels
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
          Choose the role that fits your needs
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
        {roles.map((role, index) => (
          <div
            key={index}
            className="group relative bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-lg animate-scaleIn"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            {/* Badge */}
            <div className="absolute top-4 right-4">
              <span className="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                {role.badge}
              </span>
            </div>

            {/* Icon */}
            <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${role.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <role.icon className="w-7 h-7 text-white" />
            </div>

            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              {role.title}
            </h3>

            {/* Description */}
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed mb-4">
              {role.description}
            </p>

            {/* Learn More Link */}
            {role.link && (
              <Link
                href={role.link}
                className="inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                Learn More
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
