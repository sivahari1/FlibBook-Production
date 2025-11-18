'use client';

import dynamic from 'next/dynamic';

const PreviewClient = dynamic(() => import('./PreviewClient'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Loading preview...</p>
      </div>
    </div>
  ),
});

interface PreviewWrapperProps {
  documentTitle: string;
  pdfUrl: string;
  userEmail: string;
  documentId: string;
}

export default function PreviewWrapper(props: PreviewWrapperProps) {
  return <PreviewClient {...props} />;
}
