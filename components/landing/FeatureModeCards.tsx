'use client';

import React from 'react';
import { Shield, Users, Lock, Eye, Droplets, UserCheck, BarChart3, BookOpen, Library, CreditCard, Home, RotateCcw, Sparkles } from 'lucide-react';

const FeatureModeCards = () => {
  const collaborativeFeatures = [
    { icon: Shield, text: "Secure sharing of documents", delay: "0ms" },
    { icon: Lock, text: "Enterprise grade protection", delay: "100ms" },
    { icon: UserCheck, text: "Privacy", delay: "200ms" },
    { icon: Eye, text: "Security", delay: "300ms" },
    { icon: Droplets, text: "Dynamic watermarks", delay: "400ms" },
    { icon: Users, text: "Share privately", delay: "500ms" },
    { icon: BarChart3, text: "Real time analytics", delay: "600ms" }
  ];

  const readingRoomFeatures = [
    { icon: Library, text: "Curated digital library", delay: "0ms" },
    { icon: BookOpen, text: "Availability of both free and premium documents, books, and course materials", delay: "100ms" },
    { icon: CreditCard, text: "Flexible payment mode to access premium content", delay: "200ms" },
    { icon: Home, text: "Similar to your next door library", delay: "300ms" },
    { icon: RotateCcw, text: "Rent a content and return the content after studying", delay: "400ms" }
  ];

  return (
    <section className="py-16 px-4 bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 animate-fadeIn">
            Choose Your Mode
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto animate-slideIn" style={{ animationDelay: '0.2s' }}>
            Experience jStudyRoom in two powerful modes designed for different learning and collaboration needs
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Collaborative Mode Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-3xl p-8 lg:p-10 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 animate-slideInLeft">
              {/* Card Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-2xl mb-6 shadow-lg animate-float">
                  <Users className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-green-800 dark:text-green-300 mb-4">
                  Collaborative Mode
                </h3>
                <p className="text-green-700 dark:text-green-400 text-lg">
                  Perfect for teams and organizations requiring secure document collaboration
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {collaborativeFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-white/50 dark:bg-green-900/30 rounded-xl hover:bg-white/70 dark:hover:bg-green-900/50 transition-all duration-300 transform hover:scale-105 animate-fadeInUp"
                    style={{ animationDelay: feature.delay }}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center shadow-md">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-green-800 dark:text-green-200 font-medium text-lg">
                        {feature.text}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center space-x-2 text-green-600 dark:text-green-400 font-semibold">
                  <Shield className="w-5 h-5" />
                  <span>Enterprise-Ready Digital Collaboration</span>
                </div>
              </div>
            </div>
          </div>

          {/* Reading Room Mode Card */}
          <div className="group relative">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-green-700 rounded-3xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity duration-500"></div>
            <div className="relative bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border border-green-200 dark:border-green-700 rounded-3xl p-8 lg:p-10 hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 animate-slideInRight">
              {/* Card Header */}
              <div className="text-center mb-8">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-600 to-green-700 rounded-2xl mb-6 shadow-lg animate-float">
                  <BookOpen className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-3xl font-bold text-green-800 dark:text-green-300 mb-4">
                  Reading Room Mode
                </h3>
                <p className="text-green-700 dark:text-green-400 text-lg">
                  Your personal digital library with flexible access to premium content
                </p>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                {readingRoomFeatures.map((feature, index) => (
                  <div
                    key={index}
                    className="flex items-center space-x-4 p-4 bg-white/50 dark:bg-green-900/30 rounded-xl hover:bg-white/70 dark:hover:bg-green-900/50 transition-all duration-300 transform hover:scale-105 animate-fadeInUp"
                    style={{ animationDelay: feature.delay }}
                  >
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center shadow-md">
                        <feature.icon className="w-6 h-6 text-white" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className="text-green-800 dark:text-green-200 font-medium text-lg">
                        {feature.text}
                      </p>
                    </div>
                    <div className="w-2 h-2 bg-green-600 rounded-full animate-pulse"></div>
                  </div>
                ))}
              </div>

              {/* Card Footer */}
              <div className="mt-8 text-center">
                <div className="inline-flex items-center space-x-2 text-green-600 dark:text-green-400 font-semibold">
                  <Library className="w-5 h-5" />
                  <span>Your Digital Library</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="text-center mt-12 animate-fadeIn" style={{ animationDelay: '1s' }}>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            Ready to transform your learning and collaboration experience?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/roles/platform-user"
              className="px-8 py-4 bg-gradient-to-r from-green-500 to-green-600 text-white font-semibold rounded-xl hover:from-green-600 hover:to-green-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl inline-block"
            >
              Start Collaborating
            </a>
            <a 
              href="/roles/member"
              className="px-8 py-4 bg-gradient-to-r from-green-600 to-green-700 text-white font-semibold rounded-xl hover:from-green-700 hover:to-green-800 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl inline-block"
            >
              Explore as a Reading Room Member
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default FeatureModeCards;
