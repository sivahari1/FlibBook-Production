/**
 * Unit tests for the Alerts API endpoints
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET, POST, PUT } from '../route';
import { NextRequest } from 'next/server';

// Mock the alerting system
vi.mock('@/lib/monitoring/alerting-system', () => ({
  alertingSystem: {
    testNotifications: vi.fn(),
    checkAndTriggerAlerts: vi.fn(),
    updateAlertRule: vi.fn(),
    updateChannel: vi.fn()
  },
  getAlerts: vi.fn(),
  getAlertStats: vi.fn()
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn()
  }
}));

describe('/api/monitoring/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/monitoring/alerts', () => {
    it('should get alerts with default parameters', async () => {
      const { getAlerts } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(getAlerts).mockResolvedValue([
        {
          id: 'test-alert-1',
          timestamp: new Date(),
          severity: 'high' as const,
          metric: 'conversion_failure_rate',
          currentValue: 10,
          threshold: 5,
          comparison: 'greater_than' as const,
          message: 'Test alert',
          resolved: false,
          escalated: false,
          notificationsSent: []
        }
      ]);

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.count).toBe(1);
    });

    it('should get alerts with filtering parameters', async () => {
      const { getAlerts } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(getAlerts).mockResolvedValue([]);

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?resolved=true&severity=high&limit=10');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(getAlerts).toHaveBeenCalledWith({
        resolved: true,
        severity: 'high',
        metric: undefined,
        limit: 10
      });
    });

    it('should get alert statistics', async () => {
      const { getAlertStats } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(getAlertStats).mockResolvedValue({
        total: 5,
        resolved: 3,
        unresolved: 2,
        escalated: 1,
        bySeverity: { high: 2, medium: 3 },
        byMetric: { conversion_failure_rate: 2, queue_depth: 3 }
      });

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?action=stats');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.total).toBe(5);
      expect(data.data.resolved).toBe(3);
    });

    it('should get alert statistics with time range', async () => {
      const { getAlertStats } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(getAlertStats).mockResolvedValue({
        total: 2,
        resolved: 1,
        unresolved: 1,
        escalated: 0,
        bySeverity: { high: 1, medium: 1 },
        byMetric: { conversion_failure_rate: 2 }
      });

      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-02T00:00:00Z';
      const request = new NextRequest(`http://localhost:3000/api/monitoring/alerts?action=stats&start=${startDate}&end=${endDate}`);
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(getAlertStats).toHaveBeenCalledWith({
        start: new Date(startDate),
        end: new Date(endDate)
      });
    });

    it('should handle errors gracefully', async () => {
      const { getAlerts } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(getAlerts).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts');
      const response = await GET(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to get alerts');
    });
  });

  describe('POST /api/monitoring/alerts', () => {
    it('should test notification channels', async () => {
      const { alertingSystem } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(alertingSystem.testNotifications).mockResolvedValue({
        console: true,
        email: false,
        slack: true
      });

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?action=test', {
        method: 'POST'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.console).toBe(true);
      expect(data.data.email).toBe(false);
      expect(data.data.slack).toBe(true);
      expect(data.message).toBe('Test notifications sent');
    });

    it('should trigger alerts manually', async () => {
      const { alertingSystem } = await import('@/lib/monitoring/alerting-system');
      const mockAlerts = [
        {
          id: 'triggered-alert',
          timestamp: new Date(),
          severity: 'high' as const,
          metric: 'conversion_failure_rate',
          currentValue: 10,
          threshold: 5,
          comparison: 'greater_than' as const,
          message: 'Manually triggered alert',
          resolved: false,
          escalated: false,
          notificationsSent: []
        }
      ];
      vi.mocked(alertingSystem.checkAndTriggerAlerts).mockResolvedValue(mockAlerts);

      const metrics = {
        conversion_failure_rate: 10,
        average_load_time: 3000,
        queue_depth: 30,
        current_error_rate: 2
      };

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?action=trigger', {
        method: 'POST',
        body: JSON.stringify({ metrics })
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data).toHaveLength(1);
      expect(data.message).toBe('Triggered 1 alerts');
    });

    it('should return error for trigger without metrics', async () => {
      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?action=trigger', {
        method: 'POST',
        body: JSON.stringify({})
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Metrics are required');
    });

    it('should return error for invalid action', async () => {
      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?action=invalid', {
        method: 'POST'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid action');
    });

    it('should handle errors gracefully', async () => {
      const { alertingSystem } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(alertingSystem.testNotifications).mockRejectedValue(new Error('Network error'));

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?action=test', {
        method: 'POST'
      });
      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to process request');
    });
  });

  describe('PUT /api/monitoring/alerts', () => {
    it('should update alert rule successfully', async () => {
      const { alertingSystem } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(alertingSystem.updateAlertRule).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?type=rule', {
        method: 'PUT',
        body: JSON.stringify({
          ruleId: 'conversion_failure_rate',
          updates: { threshold: 8, enabled: false }
        })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Alert rule updated successfully');
      expect(alertingSystem.updateAlertRule).toHaveBeenCalledWith('conversion_failure_rate', {
        threshold: 8,
        enabled: false
      });
    });

    it('should return 404 for non-existent alert rule', async () => {
      const { alertingSystem } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(alertingSystem.updateAlertRule).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?type=rule', {
        method: 'PUT',
        body: JSON.stringify({
          ruleId: 'non_existent_rule',
          updates: { threshold: 10 }
        })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Alert rule not found');
    });

    it('should update notification channel successfully', async () => {
      const { alertingSystem } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(alertingSystem.updateChannel).mockResolvedValue(true);

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?type=channel', {
        method: 'PUT',
        body: JSON.stringify({
          channelType: 'email',
          updates: { enabled: false }
        })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.message).toBe('Notification channel updated successfully');
      expect(alertingSystem.updateChannel).toHaveBeenCalledWith('email', {
        enabled: false
      });
    });

    it('should return 404 for non-existent channel', async () => {
      const { alertingSystem } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(alertingSystem.updateChannel).mockResolvedValue(false);

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?type=channel', {
        method: 'PUT',
        body: JSON.stringify({
          channelType: 'non_existent_channel',
          updates: { enabled: false }
        })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Notification channel not found');
    });

    it('should return error for missing parameters in rule update', async () => {
      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?type=rule', {
        method: 'PUT',
        body: JSON.stringify({
          ruleId: 'test_rule'
          // Missing updates
        })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Rule ID and updates are required');
    });

    it('should return error for missing parameters in channel update', async () => {
      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?type=channel', {
        method: 'PUT',
        body: JSON.stringify({
          channelType: 'email'
          // Missing updates
        })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Channel type and updates are required');
    });

    it('should return error for invalid type parameter', async () => {
      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?type=invalid', {
        method: 'PUT',
        body: JSON.stringify({
          someData: 'test'
        })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Invalid type parameter');
    });

    it('should handle errors gracefully', async () => {
      const { alertingSystem } = await import('@/lib/monitoring/alerting-system');
      vi.mocked(alertingSystem.updateAlertRule).mockRejectedValue(new Error('Database error'));

      const request = new NextRequest('http://localhost:3000/api/monitoring/alerts?type=rule', {
        method: 'PUT',
        body: JSON.stringify({
          ruleId: 'test_rule',
          updates: { threshold: 10 }
        })
      });
      const response = await PUT(request);
      const data = await response.json();

      expect(response.status).toBe(500);
      expect(data.success).toBe(false);
      expect(data.error).toBe('Failed to update configuration');
    });
  });
});