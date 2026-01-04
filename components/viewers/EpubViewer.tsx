'use client';

interface EpubViewerProps {
  url: string;
  title?: string;
}

export function EpubViewer({ url, title = "EPUB Document" }: EpubViewerProps) {
  const handleOpenInNewTab = () => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-gray-50 p-8">
      <div className="text-center max-w-md">
        <div className="mb-6">
          <svg 
            className="mx-auto h-16 w-16 text-gray-400" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={1} 
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" 
            />
          </svg>
        </div>
        
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          EPUB Document
        </h3>
        
        <p className="text-gray-600 mb-2 font-medium">
          {title}
        </p>
        
        <p className="text-gray-500 text-sm mb-6">
          EPUB files are best viewed in a dedicated reader. Click below to open in a new tab where your browser or system can handle it appropriately.
        </p>
        
        <button
          onClick={handleOpenInNewTab}
          className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-medium"
        >
          Open in New Tab
        </button>
      </div>
    </div>
  );
}