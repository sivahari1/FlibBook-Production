'use client';

import React, { useState, useEffect } from 'react';

interface ViewerDebugPanelProps {
  documentId: string;
  isVisible?: boolean;
  onToggle?: () => void;
}

interface DiagnosticsData {
  documentId: string;
  timestamp: string;
  checks: {
    session?: any;
    authorization?: any;
    document?: any;
    databasePages?: any;
    storage?: any;
  };
  summary: {
    canView: boolean;
    hasPages: boolean;
    storageAccessible: boolean;
    healthy: boolean;
    issues: string[];
    processingTime: number;
  };
  recommendations?: string[];
}

/**
 * ViewerDebugPanel - Development tool for diagnosing viewer issues
 * 
 * This component provides a collapsible debug panel that shows:
 * - Document access permissions
 * - Page availability status
 * - Storage accessibility
 * - Recommendations for fixing issues
 * 
 * Only shown in development mode or when explicitly enabled
 */
export default function ViewerDebugPanel({ 
  documentId, 
  isVisible = false, 
  onToggle 
}: ViewerDebugPanelProps) {
  const [diagnostics, setDiagnostics] = useState<DiagnosticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  // Only show in development mode unless explicitly enabled
  const shouldShow = process.env.NODE_ENV === 'development' || isVisible;

  const runDiagnostics = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/viewer/diagnose/${documentId}`);
      
      if (!response.ok) {
        throw new Error(`Diagnostics failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      setDiagnostics(data);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-run diagnostics when panel becomes visible
  useEffect(() => {
    if (shouldShow && !diagnostics && !loading) {
      runDiagnostics();
    }
  }, [shouldShow, documentId]);

  if (!shouldShow) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => {
          if (onToggle) {
            onToggle();
          } else {
            setExpanded(!expanded);
          }
        }}
        className={`mb-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          diagnostics?.summary.healthy 
            ? 'bg-green-600 hover:bg-green-700 text-white' 
            : diagnostics?.summary.issues.length 
            ? 'bg-red-600 hover:bg-red-700 text-white'
            : 'bg-gray-600 hover:bg-gray-700 text-white'
        }`}
        title="Toggle Viewer Debug Panel"
      >
        🔍 Debug {diagnostics?.summary.healthy ? '✅' : diagnostics?.summary.issues.length ? '❌' : '❓'}
      </button>

      {/* Debug Panel */}
      {expanded && (
        <div className="bg-gray-900 text-white rounded-lg shadow-xl max-w-md w-80 max-h-96 overflow-y-auto">
          {/* Header */}
          <div className="p-3 border-b border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-sm">Viewer Diagnostics</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={runDiagnostics}
                disabled={loading}
                className="text-xs bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 px-2 py-1 rounded transition-colors"
              >
                {loading ? '⟳' : '🔄'}
              </button>
              <button
                onClick={() => setExpanded(false)}
                className="text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 text-xs">
            {loading && (
              <div className="text-center py-4">
                <div className="animate-spin text-lg">⟳</div>
                <p className="mt-2">Running diagnostics...</p>
              </div>
            )}

            {error && (
              <div className="bg-red-900 border border-red-700 rounded p-2 mb-3">
                <p className="font-semibold">Error</p>
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {diagnostics && (
              <div className="space-y-3">
                {/* Summary */}
                <div className={`rounded p-2 ${
                  diagnostics.summary.healthy 
                    ? 'bg-green-900 border border-green-700' 
                    : 'bg-red-900 border border-red-700'
                }`}>
                  <p className="font-semibold mb-1">
                    Status: {diagnostics.summary.healthy ? 'Healthy ✅' : 'Issues Found ❌'}
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-gray-300">Access:</span>
                      <br />
                      {diagnostics.summary.canView ? '✅' : '❌'}
                    </div>
                    <div>
                      <span className="text-gray-300">Pages:</span>
                      <br />
                      {diagnostics.summary.hasPages ? '✅' : '❌'}
                    </div>
                    <div>
                      <span className="text-gray-300">Storage:</span>
                      <br />
                      {diagnostics.summary.storageAccessible ? '✅' : '❌'}
                    </div>
                  </div>
                </div>

                {/* Issues */}
                {diagnostics.summary.issues.length > 0 && (
                  <div className="bg-yellow-900 border border-yellow-700 rounded p-2">
                    <p className="font-semibold mb-1">Issues ({diagnostics.summary.issues.length})</p>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostics.summary.issues.map((issue, index) => (
                        <li key={index} className="text-yellow-300">{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Recommendations */}
                {diagnostics.recommendations && diagnostics.recommendations.length > 0 && (
                  <div className="bg-blue-900 border border-blue-700 rounded p-2">
                    <p className="font-semibold mb-1">Recommendations</p>
                    <ul className="list-disc list-inside space-y-1">
                      {diagnostics.recommendations.map((rec, index) => (
                        <li key={index} className="text-blue-300">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Detailed Checks */}
                <details className="bg-gray-800 rounded p-2">
                  <summary className="font-semibold cursor-pointer">Detailed Checks</summary>
                  <div className="mt-2 space-y-2">
                    {diagnostics.checks.authorization && (
                      <div>
                        <p className="font-medium">Authorization:</p>
                        <p className="text-gray-300 ml-2">
                          Allowed: {diagnostics.checks.authorization.allowed ? '✅' : '❌'}
                          {diagnostics.checks.authorization.reason && (
                            <span className="text-yellow-300"> ({diagnostics.checks.authorization.reason})</span>
                          )}
                        </p>
                      </div>
                    )}

                    {diagnostics.checks.databasePages && (
                      <div>
                        <p className="font-medium">Database Pages:</p>
                        <p className="text-gray-300 ml-2">
                          Count: {diagnostics.checks.databasePages.count || 0}
                        </p>
                      </div>
                    )}

                    {diagnostics.checks.storage && (
                      <div>
                        <p className="font-medium">Storage:</p>
                        <p className="text-gray-300 ml-2">
                          Downloadable: {diagnostics.checks.storage.downloadable ? '✅' : '❌'}
                          {diagnostics.checks.storage.downloadError && (
                            <span className="text-red-300"> ({diagnostics.checks.storage.downloadError})</span>
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                </details>

                {/* Metadata */}
                <div className="text-gray-400 text-xs">
                  <p>Document ID: {diagnostics.documentId}</p>
                  <p>Processing Time: {diagnostics.summary.processingTime}ms</p>
                  <p>Timestamp: {new Date(diagnostics.timestamp).toLocaleTimeString()}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}