'use client';

import React from 'react';
import SimplePDFViewer from '@/components/viewers/SimplePDFViewer';

/**
 * Test page for Simple PDF Viewer
 * 
 * This page tests the SimplePDFViewer component with a sample PDF
 * to verify that PDF rendering is working correctly.
 */
export default function TestSimplePDFPage() {
  // Sample PDF URL - using a publicly available PDF for testing
  const samplePdfUrl = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';
  
  return (
    <div className="w-full h-screen bg-gray-900">
      <div className="h-full">
        <SimplePDFViewer
          pdfUrl={samplePdfUrl}
          documentTitle="Test PDF Document"
          onError={(error) => {
            console.error('[TestSimplePDF] Error:', error);
          }}
        />
      </div>
    </div>
  );
}