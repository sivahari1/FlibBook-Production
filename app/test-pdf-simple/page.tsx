'use client';

import React, { useEffect, useState } from 'react';

export default function TestPDFSimple() {
  const [status, setStatus] = useState('Loading...');
  const [pdfUrl, setPdfUrl] = useState('');

  useEffect(() => {
    // Test PDF.js loading
    const testPDFJS = async () => {
      try {
        setStatus('Testing PDF.js availability...');
        
        // Import PDF.js
        const pdfjsLib = await import('pdfjs-dist');
        
        setStatus('PDF.js loaded, setting worker...');
        
        // Set worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
        
        setStatus('Worker set, testing with sample PDF...');
        
        // Get a test PDF URL
        const response = await fetch('/api/documents');
        if (!response.ok) {
          throw new Error(`API Error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.documents && data.documents.length > 0) {
          const firstDoc = data.documents[0];
          
          // Get the PDF URL
          const pdfResponse = await fetch(`/api/documents/${firstDoc.id}/view`);
          if (pdfResponse.ok) {
            const pdfData = await pdfResponse.json();
            if (pdfData.pdfUrl) {
              setPdfUrl(pdfData.pdfUrl);
              setStatus('PDF URL obtained, testing PDF.js rendering...');
              
              // Test loading the PDF
              const loadingTask = pdfjsLib.getDocument(pdfData.pdfUrl);
              const pdf = await loadingTask.promise;
              
              setStatus(`✅ Success! PDF loaded with ${pdf.numPages} pages`);
            } else {
              setStatus('❌ No PDF URL in response');
            }
          } else {
            setStatus('❌ Failed to get PDF URL');
          }
        } else {
          setStatus('❌ No documents found');
        }
        
      } catch (error) {
        console.error('PDF.js test error:', error);
        setStatus(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    };

    testPDFJS();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">PDF.js Test</h1>
        
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Status</h2>
          <p className="text-lg">{status}</p>
        </div>
        
        {pdfUrl && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">PDF URL</h2>
            <p className="text-sm text-gray-600 break-all">{pdfUrl}</p>
          </div>
        )}
        
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Browser Console</h2>
          <p className="text-sm text-gray-600">
            Check the browser console (F12) for any PDF.js related errors.
          </p>
        </div>
      </div>
    </div>
  );
}