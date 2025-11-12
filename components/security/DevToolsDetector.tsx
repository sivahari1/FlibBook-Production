'use client';

import { useEffect, useState } from 'react';

export default function DevToolsDetector() {
  const [devToolsOpen, setDevToolsOpen] = useState(false);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout;

    const detectDevTools = () => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        setDevToolsOpen(true);
      } else {
        setDevToolsOpen(false);
      }
    };

    // Check on mount
    detectDevTools();

    // Check periodically
    checkInterval = setInterval(detectDevTools, 1000);

    // Check on resize
    window.addEventListener('resize', detectDevTools);

    return () => {
      clearInterval(checkInterval);
      window.removeEventListener('resize', detectDevTools);
    };
  }, []);

  if (!devToolsOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-90 z-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg max-w-md text-center">
        <div className="text-red-600 text-6xl mb-4">⚠️</div>
        <h2 className="text-2xl font-bold mb-4 text-gray-900">
          Unauthorized Access Detected
        </h2>
        <p className="text-gray-700 mb-4">
          Developer tools are not allowed while viewing this document. 
          This action has been logged.
        </p>
        <p className="text-sm text-gray-600">
          Please close the developer tools to continue viewing.
        </p>
      </div>
    </div>
  );
}
