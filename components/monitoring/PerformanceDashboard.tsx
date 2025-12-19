/**
 * Performance Dashboard Component
 * 
 * Displays real-time performance metrics and historical statistics
 * for JStudyRoom document viewing system.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { usePerformanceMonitoring } from '@/hooks/usePerformanceMonitoring';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

interface PerformanceStats {
  documentLoadingSuccessRate: number;
  averageConversionTime: number;
  averageLoadTime: number;
  errorRateByType: Record<string, number>;
  totalDocumentLoads: number;
  totalConversions: number;
  totalErrors: number;
  timeRange: {
    start: Date;
    end: Date;
  };
}

interface PerformanceDashboardProps {
  className?: string;
  showExportButton?: boolean;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function PerformanceDashboard({
  className = '',
  showExportButton = true,
  autoRefresh = true,
  refreshInterval = 30000
}: PerformanceDashboardProps) {
  const {
    realTimeMetrics,
    loading,
    error,
    fetchRealTimeMetrics,
    getPerformanceStats,
    exportMetrics
  } = usePerformanceMonitoring({ autoRefresh, refreshInterval });

  const [historicalStats, setHistoricalStats] = useState<PerformanceStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dateRange, setDateRange] = useState({
    start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
    end: new Date()
  });

  // Fetch historical stats
  const fetchHistoricalStats = async () => {
    setStatsLoading(true);
    try {
      const stats = await getPerformanceStats(dateRange.start, dateRange.end);
      setHistoricalStats(stats);
    } catch (err) {
      console.error('Failed to fetch historical stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Export metrics
  const handleExportMetrics = async () => {
    try {
      const metrics = await exportMetrics(dateRange.start, dateRange.end);
      if (metrics) {
        const blob = new Blob([JSON.stringify(metrics, null, 2)], {
          type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `performance-metrics-${dateRange.start.toISOString().split('T')[0]}-${dateRange.end.toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Failed to export metrics:', err);
    }
  };

  useEffect(() => {
    fetchHistoricalStats();
  }, [dateRange]);

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getStatusColor = (value: number, threshold: number, inverse = false) => {
    const isGood = inverse ? value < threshold : value > threshold;
    return isGood ? 'text-green-600' : 'text-red-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Performance Dashboard
        </h2>
        <div className="flex gap-2">
          <Button
            onClick={fetchRealTimeMetrics}
            disabled={loading}
            variant="outline"
            size="sm"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </Button>
          {showExportButton && (
            <Button
              onClick={handleExportMetrics}
              variant="outline"
              size="sm"
            >
              Export Data
            </Button>
          )}
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}

      {/* Real-time Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Active Conversions
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {realTimeMetrics?.activeConversions ?? '-'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Queue Depth
          </div>
          <div className={`text-2xl font-bold ${getStatusColor(
            realTimeMetrics?.queueDepth ?? 0,
            50,
            true
          )}`}>
            {realTimeMetrics?.queueDepth ?? '-'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Current Error Rate
          </div>
          <div className={`text-2xl font-bold ${getStatusColor(
            realTimeMetrics?.currentErrorRate ?? 0,
            5,
            true
          )}`}>
            {realTimeMetrics ? formatPercentage(realTimeMetrics.currentErrorRate) : '-'}
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Avg Response Time
          </div>
          <div className={`text-2xl font-bold ${getStatusColor(
            realTimeMetrics?.averageResponseTime ?? 0,
            5000,
            true
          )}`}>
            {realTimeMetrics ? formatDuration(realTimeMetrics.averageResponseTime) : '-'}
          </div>
        </Card>
      </div>

      {/* Date Range Selector */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">Historical Statistics</h3>
        <div className="flex gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="datetime-local"
              value={dateRange.start.toISOString().slice(0, 16)}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                start: new Date(e.target.value)
              }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="datetime-local"
              value={dateRange.end.toISOString().slice(0, 16)}
              onChange={(e) => setDateRange(prev => ({
                ...prev,
                end: new Date(e.target.value)
              }))}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>
          <div className="flex items-end">
            <Button
              onClick={fetchHistoricalStats}
              disabled={statsLoading}
              size="sm"
            >
              {statsLoading ? 'Loading...' : 'Update'}
            </Button>
          </div>
        </div>

        {/* Historical Stats Grid */}
        {historicalStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Document Loading Success Rate
              </div>
              <div className={`text-xl font-bold ${getStatusColor(
                historicalStats.documentLoadingSuccessRate,
                99
              )}`}>
                {formatPercentage(historicalStats.documentLoadingSuccessRate)}
              </div>
              <div className="text-xs text-gray-500">
                {historicalStats.totalDocumentLoads} total loads
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Average Load Time
              </div>
              <div className={`text-xl font-bold ${getStatusColor(
                historicalStats.averageLoadTime,
                3000,
                true
              )}`}>
                {formatDuration(historicalStats.averageLoadTime)}
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Average Conversion Time
              </div>
              <div className={`text-xl font-bold ${getStatusColor(
                historicalStats.averageConversionTime,
                60000,
                true
              )}`}>
                {formatDuration(historicalStats.averageConversionTime)}
              </div>
              <div className="text-xs text-gray-500">
                {historicalStats.totalConversions} conversions
              </div>
            </div>
          </div>
        )}

        {/* Error Breakdown */}
        {historicalStats && Object.keys(historicalStats.errorRateByType).length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-3">Error Breakdown</h4>
            <div className="space-y-2">
              {Object.entries(historicalStats.errorRateByType).map(([errorType, rate]) => (
                <div key={errorType} className="flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {errorType}
                  </span>
                  <span className={`text-sm font-medium ${getStatusColor(rate, 1, true)}`}>
                    {formatPercentage(rate)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Status Indicators */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">System Health</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              (realTimeMetrics?.currentErrorRate ?? 0) < 5 ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm">Error Rate</span>
            <span className="text-xs text-gray-500">
              {(realTimeMetrics?.currentErrorRate ?? 0) < 5 ? 'Healthy' : 'Alert'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              (realTimeMetrics?.averageResponseTime ?? 0) < 5000 ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm">Response Time</span>
            <span className="text-xs text-gray-500">
              {(realTimeMetrics?.averageResponseTime ?? 0) < 5000 ? 'Healthy' : 'Alert'}
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              (realTimeMetrics?.queueDepth ?? 0) < 50 ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-sm">Queue Depth</span>
            <span className="text-xs text-gray-500">
              {(realTimeMetrics?.queueDepth ?? 0) < 50 ? 'Healthy' : 'Alert'}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
}