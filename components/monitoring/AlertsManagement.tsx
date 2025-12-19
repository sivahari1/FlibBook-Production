/**
 * Alerts Management Component
 * 
 * Provides a comprehensive interface for managing alerts including:
 * - Viewing active and resolved alerts
 * - Configuring alert rules and thresholds
 * - Managing notification channels
 * - Testing notification systems
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';

interface Alert {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  comparison: 'greater_than' | 'less_than';
  message: string;
  resolved: boolean;
  resolvedAt?: Date;
  escalated: boolean;
  escalatedAt?: Date;
  notificationsSent: string[];
}

interface AlertStats {
  total: number;
  resolved: number;
  unresolved: number;
  escalated: number;
  bySeverity: Record<string, number>;
  byMetric: Record<string, number>;
}

interface AlertRule {
  id: string;
  name: string;
  metric: string;
  threshold: number;
  comparison: 'greater_than' | 'less_than';
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  throttleMinutes: number;
  escalationMinutes?: number;
  description: string;
}

interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'console';
  enabled: boolean;
  config: Record<string, any>;
  severityFilter: ('low' | 'medium' | 'high' | 'critical')[];
}

export default function AlertsManagement() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<AlertStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'alerts' | 'rules' | 'channels' | 'stats'>('alerts');
  const [showTestModal, setShowTestModal] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, boolean> | null>(null);
  const [filter, setFilter] = useState({
    resolved: undefined as boolean | undefined,
    severity: '',
    metric: ''
  });

  useEffect(() => {
    loadData();
  }, [filter]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load alerts
      const alertsParams = new URLSearchParams();
      if (filter.resolved !== undefined) {
        alertsParams.set('resolved', filter.resolved.toString());
      }
      if (filter.severity) {
        alertsParams.set('severity', filter.severity);
      }
      if (filter.metric) {
        alertsParams.set('metric', filter.metric);
      }
      alertsParams.set('limit', '50');

      const alertsResponse = await fetch(`/api/monitoring/alerts?${alertsParams}`);
      const alertsData = await alertsResponse.json();

      if (!alertsData.success) {
        throw new Error(alertsData.error || 'Failed to load alerts');
      }

      setAlerts(alertsData.data.map((alert: any) => ({
        ...alert,
        timestamp: new Date(alert.timestamp),
        resolvedAt: alert.resolvedAt ? new Date(alert.resolvedAt) : undefined,
        escalatedAt: alert.escalatedAt ? new Date(alert.escalatedAt) : undefined
      })));

      // Load stats
      const statsResponse = await fetch('/api/monitoring/alerts?action=stats');
      const statsData = await statsResponse.json();

      if (statsData.success) {
        setStats(statsData.data);
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const testNotifications = async () => {
    try {
      setTestResults(null);
      const response = await fetch('/api/monitoring/alerts?action=test', {
        method: 'POST'
      });
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to test notifications');
      }

      setTestResults(data.data);
      setShowTestModal(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to test notifications');
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'text-yellow-600 bg-yellow-50';
      case 'medium': return 'text-orange-600 bg-orange-50';
      case 'high': return 'text-red-600 bg-red-50';
      case 'critical': return 'text-red-800 bg-red-100';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getSeverityEmoji = (severity: string) => {
    switch (severity) {
      case 'low': return '🟡';
      case 'medium': return '🟠';
      case 'high': return '🔴';
      case 'critical': return '🚨';
      default: return '⚪';
    }
  };

  const formatDuration = (start: Date, end?: Date) => {
    const endTime = end || new Date();
    const duration = endTime.getTime() - start.getTime();
    const minutes = Math.floor(duration / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading alerts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Alerts Management</h2>
        <div className="flex space-x-2">
          <Button
            onClick={testNotifications}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>🧪</span>
            <span>Test Notifications</span>
          </Button>
          <Button
            onClick={loadData}
            variant="outline"
            className="flex items-center space-x-2"
          >
            <span>🔄</span>
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <span className="text-red-400">⚠️</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">📊</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Total Alerts</p>
                <p className="text-2xl font-semibold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">🔴</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Unresolved</p>
                <p className="text-2xl font-semibold text-red-600">{stats.unresolved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">✅</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Resolved</p>
                <p className="text-2xl font-semibold text-green-600">{stats.resolved}</p>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-2xl">⬆️</span>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-500">Escalated</p>
                <p className="text-2xl font-semibold text-orange-600">{stats.escalated}</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'alerts', label: 'Alerts', icon: '🚨' },
            { id: 'rules', label: 'Rules', icon: '⚙️' },
            { id: 'channels', label: 'Channels', icon: '📢' },
            { id: 'stats', label: 'Statistics', icon: '📈' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="space-y-4">
          {/* Filters */}
          <Card className="p-4">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={filter.resolved === undefined ? '' : filter.resolved.toString()}
                  onChange={(e) => setFilter(prev => ({
                    ...prev,
                    resolved: e.target.value === '' ? undefined : e.target.value === 'true'
                  }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="false">Unresolved</option>
                  <option value="true">Resolved</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={filter.severity}
                  onChange={(e) => setFilter(prev => ({ ...prev, severity: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metric
                </label>
                <select
                  value={filter.metric}
                  onChange={(e) => setFilter(prev => ({ ...prev, metric: e.target.value }))}
                  className="border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">All</option>
                  <option value="conversion_failure_rate">Conversion Failure Rate</option>
                  <option value="average_load_time">Average Load Time</option>
                  <option value="queue_depth">Queue Depth</option>
                  <option value="current_error_rate">Error Rate</option>
                </select>
              </div>
            </div>
          </Card>

          {/* Alerts List */}
          <div className="space-y-3">
            {alerts.length === 0 ? (
              <Card className="p-8 text-center">
                <span className="text-4xl mb-4 block">🎉</span>
                <h3 className="text-lg font-medium text-gray-900 mb-2">No alerts found</h3>
                <p className="text-gray-500">
                  {Object.values(filter).some(v => v !== undefined && v !== '') 
                    ? 'Try adjusting your filters to see more alerts.'
                    : 'Everything is running smoothly!'}
                </p>
              </Card>
            ) : (
              alerts.map((alert) => (
                <Card key={alert.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl">{getSeverityEmoji(alert.severity)}</span>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(alert.severity)}`}>
                            {alert.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">
                            {alert.metric.replace(/_/g, ' ').toUpperCase()}
                          </span>
                          {alert.escalated && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              ESCALATED
                            </span>
                          )}
                          {alert.resolved && (
                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              RESOLVED
                            </span>
                          )}
                        </div>
                        <p className="text-gray-900 mb-2">{alert.message}</p>
                        <div className="text-sm text-gray-500 space-y-1">
                          <div>
                            <strong>Current:</strong> {alert.currentValue} | 
                            <strong> Threshold:</strong> {alert.threshold} | 
                            <strong> Time:</strong> {alert.timestamp.toLocaleString()}
                          </div>
                          {alert.resolved && alert.resolvedAt && (
                            <div>
                              <strong>Duration:</strong> {formatDuration(alert.timestamp, alert.resolvedAt)}
                            </div>
                          )}
                          {!alert.resolved && (
                            <div>
                              <strong>Active for:</strong> {formatDuration(alert.timestamp)}
                            </div>
                          )}
                          {alert.notificationsSent.length > 0 && (
                            <div>
                              <strong>Notifications sent:</strong> {alert.notificationsSent.join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      )}

      {/* Other tabs would be implemented here */}
      {activeTab !== 'alerts' && (
        <Card className="p-8 text-center">
          <span className="text-4xl mb-4 block">🚧</span>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-500">
            The {activeTab} tab is under development and will be available soon.
          </p>
        </Card>
      )}

      {/* Test Notifications Modal */}
      <Modal
        isOpen={showTestModal}
        onClose={() => setShowTestModal(false)}
        title="Notification Test Results"
      >
        <div className="space-y-4">
          {testResults && Object.entries(testResults).map(([channel, success]) => (
            <div key={channel} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center space-x-3">
                <span className="text-lg">
                  {channel === 'console' && '🖥️'}
                  {channel === 'email' && '📧'}
                  {channel === 'slack' && '💬'}
                  {channel === 'webhook' && '🔗'}
                </span>
                <span className="font-medium capitalize">{channel}</span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                success 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {success ? '✅ Success' : '❌ Failed'}
              </span>
            </div>
          ))}
          <div className="flex justify-end">
            <Button onClick={() => setShowTestModal(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}