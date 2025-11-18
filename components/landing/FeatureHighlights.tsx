'use client';

import { Shield, Droplet, Library, Share2 } from 'lucide-react';

export default function FeatureHighlights() {
  const features = [
    {
      icon: Shield,
      title: 'DRM Secure',
      description: 'Military-grade encryption',
      color: 'from-blue-500 to-cyan-500',
      delay: 0.5
    },
    {
      icon: Droplet,
      title: 'Dynamic Watermarks',
      description: 'Auto viewer identification',
      color: 'from-purple-500 to-pink-500',
      delay: 0.6
    },
    {
      icon: Library,
      title: 'Personal Library',
      description: 'Curated digital collection',
      color: 'from-pink-500 to-rose-500',
      delay: 0.7
    },
    {
      icon: Share2,
      title: 'Share Privately',
      description: 'Controlled access links',
      color: 'from-indigo-500 to-purple-500',
      delay: 0.8
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-5xl mx-auto mt-20 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
      {features.map((feature, index) => (
        <div
          key={index}
          className="group relative bg-white/60 dark:bg-gray-800/60 backdrop-blur-lg rounded-2xl p-6 border border-gray-200/50 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-300 hover:shadow-xl hover:-translate-y-1 animate-scaleIn"
          style={{ animationDelay: `${feature.delay}s` }}
        >
          {/* Gradient Background on Hover */}
          <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 rounded-2xl transition-opacity duration-300`}></div>
          
          <div className="relative z-10">
            {/* Icon */}
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
              <feature.icon className="w-6 h-6 text-white" />
            </div>
            
            {/* Title */}
            <h3 className="text-sm md:text-base font-bold text-gray-900 dark:text-white mb-1">
              {feature.title}
            </h3>
            
            {/* Description */}
            <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">
              {feature.description}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
