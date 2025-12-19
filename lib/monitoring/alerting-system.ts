/**
 * Alerting System for JStudyRoom Performance Monitoring
 * 
 * This module provides comprehensive alerting capabilities including:
 * - Email notifications for critical issues
 * - Slack integration for team notifications
 * - Webhook support for custom integrations
 * - Alert throttling to prevent spam
 * - Alert escalation for unresolved issues
 */

import { logger } from '@/lib/logger';
import { Resend } from 'resend';

export interface Alert {
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

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'console';
  enabled: boolean;
  config: Record<string, any>;
  severityFilter: ('low' | 'medium' | 'high' | 'critical')[];
}

export interface AlertRule {
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

class AlertingSystem {
  private alerts: Alert[] = [];
  private alertRules: AlertRule[] = [
    {
      id: 'conversion_failure_rate',
      name: 'High Conversion Failure Rate',
      metric: 'conversion_failure_rate',
      threshold: 5, // 5%
      comparison: 'greater_than',
      severity: 'high',
      enabled: true,
      throttleMinutes: 15,
      escalationMinutes: 60,
      description: 'Document conversion failure rate exceeds acceptable threshold'
    },
    {
      id: 'average_load_time',
      name: 'Slow Document Loading',
      metric: 'average_load_time',
      threshold: 5000, // 5 seconds
      comparison: 'greater_than',
      severity: 'medium',
      enabled: true,
      throttleMinutes: 10,
      escalationMinutes: 30,
      description: 'Average document load time is too slow'
    },
    {
      id: 'queue_depth',
      name: 'High Queue Depth',
      metric: 'queue_depth',
      threshold: 50,
      comparison: 'greater_than',
      severity: 'high',
      enabled: true,
      throttleMinutes: 5,
      escalationMinutes: 20,
      description: 'Conversion queue depth is too high'
    },
    {
      id: 'critical_queue_depth',
      name: 'Critical Queue Depth',
      metric: 'queue_depth',
      threshold: 100,
      comparison: 'greater_than',
      severity: 'critical',
      enabled: true,
      throttleMinutes: 2,
      escalationMinutes: 10,
      description: 'Conversion queue depth is critically high'
    },
    {
      id: 'error_rate_spike',
      name: 'Error Rate Spike',
      metric: 'current_error_rate',
      threshold: 10, // 10%
      comparison: 'greater_than',
      severity: 'critical',
      enabled: true,
      throttleMinutes: 5,
      escalationMinutes: 15,
      description: 'Overall error rate has spiked significantly'
    }
  ];

  private channels: AlertChannel[] = [
    {
      type: 'console',
      enabled: true,
      config: {},
      severityFilter: ['low', 'medium', 'high', 'critical']
    },
    {
      type: 'email',
      enabled: process.env.RESEND_API_KEY ? true : false,
      config: {
        from: process.env.ALERT_FROM_EMAIL || 'alerts@jstudyroom.com',
        to: process.env.ALERT_TO_EMAIL || 'admin@jstudyroom.com',
        subject: 'JStudyRoom Performance Alert'
      },
      severityFilter: ['high', 'critical']
    },
    {
      type: 'slack',
      enabled: process.env.SLACK_WEBHOOK_URL ? true : false,
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL,
        channel: process.env.SLACK_ALERT_CHANNEL || '#alerts'
      },
      severityFilter: ['medium', 'high', 'critical']
    }
  ];

  private resend?: Resend;

  constructor() {
    if (process.env.RESEND_API_KEY) {
      this.resend = new Resend(process.env.RESEND_API_KEY);
    }
  }

  /**
   * Check if an alert should be triggered for the given metric
   */
  async checkAndTriggerAlerts(metrics: {
    conversion_failure_rate: number;
    average_load_time: number;
    queue_depth: number;
    current_error_rate: number;
  }): Promise<Alert[]> {
    const triggeredAlerts: Alert[] = [];

    for (const rule of this.alertRules) {
      if (!rule.enabled) continue;

      const currentValue = metrics[rule.metric as keyof typeof metrics];
      if (currentValue === undefined) continue;

      const shouldTrigger = rule.comparison === 'greater_than' 
        ? currentValue > rule.threshold
        : currentValue < rule.threshold;

      if (shouldTrigger) {
        const alert = await this.triggerAlert(rule, currentValue);
        if (alert) {
          triggeredAlerts.push(alert);
        }
      } else {
        // Check if we should resolve any existing alerts for this rule
        await this.resolveAlertsForRule(rule.id);
      }
    }

    // Check for escalations
    await this.checkEscalations();

    return triggeredAlerts;
  }

  /**
   * Trigger an alert if not throttled
   */
  private async triggerAlert(rule: AlertRule, currentValue: number): Promise<Alert | null> {
    // Check if we should throttle this alert (check by rule ID, not just metric)
    const recentAlert = this.alerts
      .filter(a => a.id.startsWith(rule.id) && !a.resolved)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];

    if (recentAlert) {
      const timeSinceLastAlert = Date.now() - recentAlert.timestamp.getTime();
      const throttleMs = rule.throttleMinutes * 60 * 1000;
      
      if (timeSinceLastAlert < throttleMs) {
        logger.debug('Alert throttled', { rule: rule.id, timeSinceLastAlert, throttleMs });
        return null;
      }
    }

    // Create new alert
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      timestamp: new Date(),
      severity: rule.severity,
      metric: rule.metric,
      currentValue,
      threshold: rule.threshold,
      comparison: rule.comparison,
      message: `${rule.name}: ${rule.description}. Current value: ${currentValue}, Threshold: ${rule.threshold}`,
      resolved: false,
      escalated: false,
      notificationsSent: []
    };

    this.alerts.push(alert);

    // Send notifications
    await this.sendNotifications(alert);

    logger.warn('Alert triggered', {
      alertId: alert.id,
      rule: rule.id,
      severity: alert.severity,
      currentValue,
      threshold: rule.threshold
    });

    return alert;
  }

  /**
   * Resolve alerts for a specific rule when conditions are no longer met
   */
  private async resolveAlertsForRule(ruleId: string): Promise<void> {
    const unresolvedAlerts = this.alerts.filter(a => 
      a.metric === ruleId && !a.resolved
    );

    for (const alert of unresolvedAlerts) {
      alert.resolved = true;
      alert.resolvedAt = new Date();

      logger.info('Alert resolved', {
        alertId: alert.id,
        rule: ruleId,
        duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
      });

      // Send resolution notification for high/critical alerts
      if (alert.severity === 'high' || alert.severity === 'critical') {
        await this.sendResolutionNotification(alert);
      }
    }
  }

  /**
   * Check for alerts that need escalation
   */
  private async checkEscalations(): Promise<void> {
    const now = new Date();
    
    for (const alert of this.alerts) {
      if (alert.resolved || alert.escalated) continue;

      const rule = this.alertRules.find(r => r.id === alert.metric);
      if (!rule || !rule.escalationMinutes) continue;

      const timeSinceAlert = now.getTime() - alert.timestamp.getTime();
      const escalationMs = rule.escalationMinutes * 60 * 1000;

      if (timeSinceAlert >= escalationMs) {
        await this.escalateAlert(alert);
      }
    }
  }

  /**
   * Escalate an unresolved alert
   */
  private async escalateAlert(alert: Alert): Promise<void> {
    alert.escalated = true;
    alert.escalatedAt = new Date();

    const escalatedAlert: Alert = {
      ...alert,
      id: `${alert.id}_escalated`,
      timestamp: new Date(),
      severity: alert.severity === 'critical' ? 'critical' : 'high',
      message: `ESCALATED: ${alert.message} (Unresolved for ${Math.round((Date.now() - alert.timestamp.getTime()) / 60000)} minutes)`,
      escalated: false,
      notificationsSent: []
    };

    this.alerts.push(escalatedAlert);
    await this.sendNotifications(escalatedAlert);

    logger.error('Alert escalated', {
      originalAlertId: alert.id,
      escalatedAlertId: escalatedAlert.id,
      duration: Date.now() - alert.timestamp.getTime()
    });
  }

  /**
   * Send notifications through all enabled channels
   */
  private async sendNotifications(alert: Alert): Promise<void> {
    const enabledChannels = this.channels.filter(c => 
      c.enabled && c.severityFilter.includes(alert.severity)
    );

    for (const channel of enabledChannels) {
      try {
        await this.sendNotification(channel, alert);
        alert.notificationsSent.push(channel.type);
      } catch (error) {
        logger.error('Failed to send notification', {
          channel: channel.type,
          alertId: alert.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  }

  /**
   * Send notification through a specific channel
   */
  private async sendNotification(channel: AlertChannel, alert: Alert): Promise<void> {
    switch (channel.type) {
      case 'console':
        this.sendConsoleNotification(alert);
        break;
      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert);
        break;
      case 'webhook':
        await this.sendWebhookNotification(channel, alert);
        break;
    }
  }

  /**
   * Send console notification
   */
  private sendConsoleNotification(alert: Alert): void {
    const emoji = {
      low: '🟡',
      medium: '🟠',
      high: '🔴',
      critical: '🚨'
    }[alert.severity];

    console.warn(`${emoji} ALERT [${alert.severity.toUpperCase()}]: ${alert.message}`);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: AlertChannel, alert: Alert): Promise<void> {
    if (!this.resend) {
      throw new Error('Resend not configured');
    }

    const subject = `${channel.config.subject} - ${alert.severity.toUpperCase()}`;
    const html = this.generateEmailHTML(alert);

    await this.resend.emails.send({
      from: channel.config.from,
      to: channel.config.to,
      subject,
      html
    });
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: AlertChannel, alert: Alert): Promise<void> {
    const color = {
      low: '#ffeb3b',
      medium: '#ff9800',
      high: '#f44336',
      critical: '#d32f2f'
    }[alert.severity];

    const payload = {
      channel: channel.config.channel,
      attachments: [{
        color,
        title: `JStudyRoom Alert - ${alert.severity.toUpperCase()}`,
        text: alert.message,
        fields: [
          {
            title: 'Metric',
            value: alert.metric,
            short: true
          },
          {
            title: 'Current Value',
            value: alert.currentValue.toString(),
            short: true
          },
          {
            title: 'Threshold',
            value: alert.threshold.toString(),
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp.toISOString(),
            short: true
          }
        ],
        footer: 'JStudyRoom Monitoring',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(channel: AlertChannel, alert: Alert): Promise<void> {
    const payload = {
      alert,
      timestamp: new Date().toISOString(),
      source: 'jstudyroom-monitoring'
    };

    const response = await fetch(channel.config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(channel.config.headers || {})
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.statusText}`);
    }
  }

  /**
   * Send resolution notification
   */
  private async sendResolutionNotification(alert: Alert): Promise<void> {
    const resolutionAlert: Alert = {
      ...alert,
      id: `${alert.id}_resolved`,
      timestamp: new Date(),
      message: `RESOLVED: ${alert.message}`,
      notificationsSent: []
    };

    await this.sendNotifications(resolutionAlert);
  }

  /**
   * Generate HTML for email notifications
   */
  private generateEmailHTML(alert: Alert): string {
    const severityColor = {
      low: '#ffeb3b',
      medium: '#ff9800',
      high: '#f44336',
      critical: '#d32f2f'
    }[alert.severity];

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>JStudyRoom Alert</title>
        </head>
        <body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <div style="background-color: ${severityColor}; color: white; padding: 20px;">
              <h1 style="margin: 0; font-size: 24px;">JStudyRoom Alert</h1>
              <p style="margin: 5px 0 0 0; font-size: 16px; opacity: 0.9;">${alert.severity.toUpperCase()} Severity</p>
            </div>
            <div style="padding: 20px;">
              <h2 style="color: #333; margin-top: 0;">Alert Details</h2>
              <p style="color: #666; font-size: 16px; line-height: 1.5;">${alert.message}</p>
              
              <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Metric:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${alert.metric}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Current Value:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${alert.currentValue}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Threshold:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${alert.threshold}</td>
                </tr>
                <tr>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; font-weight: bold; color: #333;">Time:</td>
                  <td style="padding: 10px; border-bottom: 1px solid #eee; color: #666;">${alert.timestamp.toLocaleString()}</td>
                </tr>
              </table>
              
              <p style="color: #999; font-size: 14px; margin-top: 30px;">
                This alert was generated by the JStudyRoom monitoring system. Please investigate and resolve the issue promptly.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Get all alerts with optional filtering
   */
  async getAlerts(options?: {
    resolved?: boolean;
    severity?: string;
    metric?: string;
    limit?: number;
  }): Promise<Alert[]> {
    let filteredAlerts = [...this.alerts];

    if (options?.resolved !== undefined) {
      filteredAlerts = filteredAlerts.filter(a => a.resolved === options.resolved);
    }

    if (options?.severity) {
      filteredAlerts = filteredAlerts.filter(a => a.severity === options.severity);
    }

    if (options?.metric) {
      filteredAlerts = filteredAlerts.filter(a => a.metric === options.metric);
    }

    // Sort by timestamp (newest first)
    filteredAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (options?.limit) {
      filteredAlerts = filteredAlerts.slice(0, options.limit);
    }

    return filteredAlerts;
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(timeRange?: { start: Date; end: Date }): Promise<{
    total: number;
    resolved: number;
    unresolved: number;
    escalated: number;
    bySeverity: Record<string, number>;
    byMetric: Record<string, number>;
  }> {
    let alerts = this.alerts;

    if (timeRange) {
      alerts = alerts.filter(a => 
        a.timestamp >= timeRange.start && a.timestamp <= timeRange.end
      );
    }

    const stats = {
      total: alerts.length,
      resolved: alerts.filter(a => a.resolved).length,
      unresolved: alerts.filter(a => !a.resolved).length,
      escalated: alerts.filter(a => a.escalated).length,
      bySeverity: {} as Record<string, number>,
      byMetric: {} as Record<string, number>
    };

    alerts.forEach(alert => {
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      stats.byMetric[alert.metric] = (stats.byMetric[alert.metric] || 0) + 1;
    });

    return stats;
  }

  /**
   * Update alert rule configuration
   */
  async updateAlertRule(ruleId: string, updates: Partial<AlertRule>): Promise<boolean> {
    const ruleIndex = this.alertRules.findIndex(r => r.id === ruleId);
    if (ruleIndex === -1) return false;

    this.alertRules[ruleIndex] = { ...this.alertRules[ruleIndex], ...updates };
    
    logger.info('Alert rule updated', { ruleId, updates });
    return true;
  }

  /**
   * Update notification channel configuration
   */
  async updateChannel(channelType: string, updates: Partial<AlertChannel>): Promise<boolean> {
    const channelIndex = this.channels.findIndex(c => c.type === channelType);
    if (channelIndex === -1) return false;

    this.channels[channelIndex] = { ...this.channels[channelIndex], ...updates };
    
    logger.info('Alert channel updated', { channelType, updates });
    return true;
  }

  /**
   * Test notification channels
   */
  async testNotifications(): Promise<{ [key: string]: boolean }> {
    const testAlert: Alert = {
      id: 'test_alert',
      timestamp: new Date(),
      severity: 'low',
      metric: 'test_metric',
      currentValue: 100,
      threshold: 50,
      comparison: 'greater_than',
      message: 'This is a test alert to verify notification channels are working correctly.',
      resolved: false,
      escalated: false,
      notificationsSent: []
    };

    const results: { [key: string]: boolean } = {};

    for (const channel of this.channels) {
      if (!channel.enabled) {
        results[channel.type] = false;
        continue;
      }

      try {
        await this.sendNotification(channel, testAlert);
        results[channel.type] = true;
      } catch (error) {
        results[channel.type] = false;
        logger.error('Test notification failed', {
          channel: channel.type,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }
}

// Singleton instance
export const alertingSystem = new AlertingSystem();

// Helper functions
export const checkAndTriggerAlerts = (metrics: Parameters<typeof alertingSystem.checkAndTriggerAlerts>[0]) =>
  alertingSystem.checkAndTriggerAlerts(metrics);

export const getAlerts = (options?: Parameters<typeof alertingSystem.getAlerts>[0]) =>
  alertingSystem.getAlerts(options);

export const getAlertStats = (timeRange?: Parameters<typeof alertingSystem.getAlertStats>[0]) =>
  alertingSystem.getAlertStats(timeRange);