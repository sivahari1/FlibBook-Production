'use client';

import { useEffect, useState } from 'react';

type Props = {
  url: string;
  title?: string;
  heightOffsetPx?: number;
};

export function PdfViewer({ url, title, heightOffsetPx = 220 }: Props) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const isSmall = window.matchMedia('(max-width: 768px)').matches;
    const isMobileUA = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    setIsMobile(isSmall || isMobileUA);
  }, []);

  if (!url) return null;

  const open = () => window.open(url, '_blank', 'noopener,noreferrer');

  // Mobile fallback (reliable)
  if (isMobile) {
    return (
      <div className="w-full">
        <div className="mx-auto w-full max-w-md rounded-xl border bg-white p-5">
          <div className="text-base font-semibold">{title || 'PDF Document'}</div>
          <div className="mt-1 text-sm text-gray-600">
            PDF inline preview is not supported on mobile. Please open the PDF in a new tab.
          </div>

          <div className="mt-4 flex gap-2">
            <button
              onClick={open}
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium"
            >
              Open PDF
            </button>
            <a
              href={url}
              download
              className="px-4 py-2 rounded-md border text-sm font-medium"
            >
              Download
            </a>
          </div>
        </div>
      </div>
    );
  }

  // Desktop iframe preview
  return (
    <div className="w-full">
      {/* Keep existing "Open PDF in new tab" link visible everywhere */}
      <div className="mb-2 text-right">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          Open PDF in new tab
        </a>
      </div>

      <div
        className="w-full rounded-xl overflow-hidden border border-gray-200 bg-white"
        style={{ height: `calc(100vh - ${heightOffsetPx}px)`, minHeight: 650 }}
      >
        <iframe
          src={`${url}#view=FitH`}
          title={title || 'PDF Viewer'}
          className="w-full h-full"
          loading="eager"
        />
      </div>
    </div>
  );
}
