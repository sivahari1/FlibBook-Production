'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase-client';

interface TestResult {
  step: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export default function TestPDFLoadingPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [testing, setTesting] = useState(false);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<string>('');

  const supabase = createClient();

  const addResult = (step: string, status: 'success' | 'error', message: string, details?: any) => {
    setResults(prev => [...prev, { step, status, message, details }]);
  };

  const loadDocuments = async () => {
    try {
      // Use the API endpoint instead of direct Supabase query
      const response = await fetch('/api/documents?contentType=PDF');
      if (!response.ok) {
        console.error('Failed to load documents');
        return;
      }
      
      const { documents: docs } = await response.json();
      setDocuments(docs);
      if (docs.length > 0) {
        setSelectedDoc(docs[0].id);
      }
    } catch (error) {
      console.error('Error loading documents:', error);
    }
  };

  useEffect(() => {
    loadDocuments();
  }, []);

  const runTest = async () => {
    if (!selectedDoc) {
      alert('Please select a document');
      return;
    }

    setTesting(true);
    setResults([]);

    try {
      // Step 1: Get document details
      addResult('Database Query', 'pending', 'Fetching document details...');
      const docResponse = await fetch(`/api/documents/${selectedDoc}`);
      
      if (!docResponse.ok) {
        addResult('Database Query', 'error', 'Failed to fetch document');
        setTesting(false);
        return;
      }

      const doc = await docResponse.json();
      addResult('Database Query', 'success', `Found: ${doc.title}`);

      // Step 2: Generate signed URL
      addResult('Signed URL', 'pending', 'Generating signed URL...');
      const { data: urlData, error: urlError } = await supabase.storage
        .from('documents')
        .createSignedUrl(doc.storagePath, 3600);

      if (urlError || !urlData) {
        addResult('Signed URL', 'error', 'Failed to create signed URL', urlError);
        setTesting(false);
        return;
      }

      const pdfUrl = urlData.signedUrl;
      addResult('Signed URL', 'success', 'Generated signed URL');

      // Step 3: Fetch PDF
      addResult('PDF Fetch', 'pending', 'Fetching PDF data...');
      const fetchStart = Date.now();
      const response = await fetch(pdfUrl);
      const fetchTime = Date.now() - fetchStart;

      if (!response.ok) {
        addResult('PDF Fetch', 'error', `HTTP ${response.status}: ${response.statusText}`);
        setTesting(false);
        return;
      }

      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      addResult('PDF Fetch', 'success', `Fetched in ${fetchTime}ms`, {
        contentType,
        size: contentLength ? `${(parseInt(contentLength) / 1024).toFixed(2)} KB` : 'unknown',
      });

      // Step 4: Convert to ArrayBuffer
      addResult('ArrayBuffer', 'pending', 'Converting to ArrayBuffer...');
      const arrayBuffer = await response.arrayBuffer();
      addResult('ArrayBuffer', 'success', `Converted to ArrayBuffer`, {
        size: `${(arrayBuffer.byteLength / 1024).toFixed(2)} KB`,
      });

      // Step 5: Convert to Uint8Array
      addResult('Uint8Array', 'pending', 'Converting to Uint8Array...');
      const uint8Array = new Uint8Array(arrayBuffer);
      addResult('Uint8Array', 'success', `Converted to Uint8Array`, {
        length: uint8Array.length,
      });

      // Step 6: Validate PDF header
      addResult('PDF Validation', 'pending', 'Validating PDF header...');
      if (uint8Array.length < 5) {
        addResult('PDF Validation', 'error', 'Data too small to be valid PDF');
        setTesting(false);
        return;
      }

      const header = String.fromCharCode(...uint8Array.slice(0, 5));
      if (!header.startsWith('%PDF-')) {
        addResult('PDF Validation', 'error', 'Invalid PDF header', { header });
        setTesting(false);
        return;
      }

      addResult('PDF Validation', 'success', 'Valid PDF header detected', { header });

      // Step 7: Load with PDF.js
      addResult('PDF.js Loading', 'pending', 'Loading with PDF.js...');
      
      // Dynamic import of PDF.js
      const pdfjsLib = await import('pdfjs-dist');
      pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.js`;

      const loadStart = Date.now();
      const loadingTask = pdfjsLib.getDocument({
        data: uint8Array,
        disableStream: true,
        disableAutoFetch: false,
      });

      const pdfDocument = await loadingTask.promise;
      const loadTime = Date.now() - loadStart;

      addResult('PDF.js Loading', 'success', `Loaded in ${loadTime}ms`, {
        numPages: pdfDocument.numPages,
      });

      // Step 8: Test page rendering
      addResult('Page Rendering', 'pending', 'Testing page 1 rendering...');
      const page = await pdfDocument.getPage(1);
      const viewport = page.getViewport({ scale: 1.0 });

      addResult('Page Rendering', 'success', 'Page loaded successfully', {
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
      });

      // Cleanup
      await pdfDocument.destroy();

      addResult('Complete', 'success', '✅ All tests passed!', {
        totalTime: `${Date.now() - fetchStart}ms`,
      });

    } catch (error) {
      addResult('Error', 'error', 'Test failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    }

    setTesting(false);
  };

  const successCount = results.filter(r => r.status === 'success').length;
  const errorCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h1 className="text-3xl font-bold mb-2">PDF Loading Test</h1>
          <p className="text-gray-600 mb-6">
            Test the complete PDF loading pipeline from Supabase storage through PDF.js rendering
          </p>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select PDF Document
            </label>
            <select
              value={selectedDoc}
              onChange={(e) => setSelectedDoc(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={testing}
            >
              {documents.length === 0 && (
                <option value="">Loading documents...</option>
              )}
              {documents.map((doc) => (
                <option key={doc.id} value={doc.id}>
                  {doc.title} ({doc.filename})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={runTest}
            disabled={testing || !selectedDoc}
            className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {testing ? 'Testing...' : 'Run Test'}
          </button>

          {results.length > 0 && (
            <div className="mt-8">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">Test Results</h2>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">✅ Passed: {successCount}</span>
                  <span className="text-red-600">❌ Failed: {errorCount}</span>
                </div>
              </div>

              <div className="space-y-3">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className={`p-4 rounded-lg border-l-4 ${
                      result.status === 'success'
                        ? 'bg-green-50 border-green-500'
                        : result.status === 'error'
                        ? 'bg-red-50 border-red-500'
                        : 'bg-blue-50 border-blue-500'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{result.step}</span>
                          {result.status === 'success' && <span>✅</span>}
                          {result.status === 'error' && <span>❌</span>}
                          {result.status === 'pending' && <span>⏳</span>}
                        </div>
                        <p className="text-sm text-gray-700 mt-1">{result.message}</p>
                        {result.details && (
                          <pre className="text-xs bg-white p-2 rounded mt-2 overflow-x-auto">
                            {JSON.stringify(result.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-900 mb-2">ℹ️ About This Test</h3>
          <p className="text-sm text-blue-800">
            This test verifies the complete PDF loading pipeline including:
          </p>
          <ul className="text-sm text-blue-800 mt-2 space-y-1 list-disc list-inside">
            <li>Database query for PDF documents</li>
            <li>Signed URL generation from Supabase storage</li>
            <li>PDF data fetching with proper headers</li>
            <li>ArrayBuffer to Uint8Array conversion</li>
            <li>PDF header validation</li>
            <li>PDF.js document loading</li>
            <li>Page rendering capability</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
