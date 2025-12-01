'use client';

/**
 * FlipBook Performance Example
 * 
 * Demonstrates the 60fps optimizations with performance monitoring
 * Requirements: 6.5 (60fps animation performance)
 */

import React, { useState } from 'react';
import { FlipBookViewer } from './FlipBookViewer';
import { FlipBookPerformanceMonitor } from './FlipBookPerformanceMonitor';

export function FlipBookPerformanceExample() {
  const [showMonitor, setShowMonitor] = useState(false);

  // Sample pages for demonstration
  const samplePages = [
    {
      pageNumber: 0,
      imageUrl: '/sample-page-1.jpg',
      width: 800,
      height: 1131,
    },
    {
      pageNumber: 1,
      imageUrl: '/sample-page-2.jpg',
      width: 800,
      height: 1131,
    },
    {
      pageNumber: 2,
      imageUrl: '/sample-page-3.jpg',
      width: 800,
      height: 1131,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            FlipBook 60fps Performance Demo
          </h1>
          <p className="text-gray-600">
            Experience smooth page-turning animations with real-time performance monitoring
          </p>
        </div>

        {/* Performance Toggle */}
        <div className="mb-4 flex items-center gap-4">
          <button
            onClick={() => setShowMonitor(!showMonitor)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {showMonitor ? 'Hide' : 'Show'} Performance Monitor
          </button>
          
          {showMonitor && (
            <div className="text-sm text-gray-600">
              <span className="font-medium">Target:</span> 60 FPS | 
              <span className="font-medium ml-2">Frame Time:</span> 16.67ms
            </div>
          )}
        </div>

        {/* Optimization Info */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <h3 className="font-semibold text-gray-900">GPU Acceleration</h3>
            </div>
            <p className="text-sm text-gray-600">
              All elements use hardware acceleration with CSS transforms
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <h3 className="font-semibold text-gray-900">RequestAnimationFrame</h3>
            </div>
            <p className="text-sm text-gray-600">
              Synced with browser refresh rate for smooth updates
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <h3 className="font-semibold text-gray-900">Adaptive Performance</h3>
            </div>
            <p className="text-sm text-gray-600">
              Automatically optimizes for device capabilities
            </p>
          </div>
        </div>

        {/* FlipBook Viewer */}
        <div className="bg-white rounded-lg shadow-lg p-4">
          <FlipBookViewer
            documentId="demo-doc"
            pages={samplePages}
            userEmail="demo@example.com"
            watermarkText="Demo"
            enableAnnotations={false}
          />
        </div>

        {/* Performance Monitor */}
        {showMonitor && (
          <FlipBookPerformanceMonitor
            enabled={true}
            targetFps={60}
            onMetricsUpdate={(metrics) => {
              // Log metrics for debugging
              if (metrics.fps < 54) {
                console.warn('Performance below target:', metrics);
              }
            }}
          />
        )}

        {/* Performance Tips */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">
            Performance Tips
          </h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>Desktop:</strong> Should maintain 60 FPS consistently
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>Mobile:</strong> Target is 54+ FPS (90% of 60 FPS)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>Low-End Devices:</strong> Animations automatically simplified
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600 mt-0.5">•</span>
              <span>
                <strong>Browser DevTools:</strong> Use Performance tab to verify GPU acceleration
              </span>
            </li>
          </ul>
        </div>

        {/* Technical Details */}
        <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-3">
            Technical Implementation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">CSS Optimizations</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• transform: translateZ(0)</li>
                <li>• will-change: transform</li>
                <li>• backfaceVisibility: hidden</li>
                <li>• cubic-bezier easing</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">React Optimizations</h4>
              <ul className="space-y-1 text-gray-600">
                <li>• React.memo for components</li>
                <li>• useMemo for calculations</li>
                <li>• useCallback for handlers</li>
                <li>• Lazy loading images</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default FlipBookPerformanceExample;
