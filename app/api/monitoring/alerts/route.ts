/**
 * API endpoints for alert management
 * 
 * GET /api/monitoring/alerts - Get alerts with optional filtering
 * POST /api/monitoring/alerts/test - Test notification channels
 * PUT /api/monitoring/alerts/rules - Update alert rules
 * PUT /api/monitoring/alerts/channels - Update notification channels
 */

import { NextRequest, NextResponse } from 'next/server';
import { alertingSystem, getAlerts, getAlertStats } from '@/lib/monitoring/alerting-system';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const action = searchParams.get('action');
    
    if (action === 'stats') {
      // Get alert statistics
      const startDate = searchParams.get('start');
      const endDate = searchParams.get('end');
      
      const timeRange = startDate && endDate ? {
        start: new Date(startDate),
        end: new Date(endDate)
      } : undefined;
      
      const stats = await getAlertStats(timeRange);
      
      return NextResponse.json({
        success: true,
        data: stats
      });
    }
    
    // Get alerts with filtering
    const resolved = searchParams.get('resolved');
    const severity = searchParams.get('severity');
    const metric = searchParams.get('metric');
    const limit = searchParams.get('limit');
    
    const options = {
      resolved: resolved ? resolved === 'true' : undefined,
      severity: severity || undefined,
      metric: metric || undefined,
      limit: limit ? parseInt(limit) : undefined
    };
    
    const alerts = await getAlerts(options);
    
    return NextResponse.json({
      success: true,
      data: alerts,
      count: alerts.length
    });
    
  } catch (error) {
    logger.error('Failed to get alerts', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to get alerts'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    
    if (action === 'test') {
      // Test notification channels
      const results = await alertingSystem.testNotifications();
      
      return NextResponse.json({
        success: true,
        data: results,
        message: 'Test notifications sent'
      });
    }
    
    if (action === 'trigger') {
      // Manually trigger alert check (for testing/debugging)
      const body = await request.json();
      const { metrics } = body;
      
      if (!metrics) {
        return NextResponse.json({
          success: false,
          error: 'Metrics are required'
        }, { status: 400 });
      }
      
      const alerts = await alertingSystem.checkAndTriggerAlerts(metrics);
      
      return NextResponse.json({
        success: true,
        data: alerts,
        message: `Triggered ${alerts.length} alerts`
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    logger.error('Failed to process alert request', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to process request'
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const body = await request.json();
    
    if (type === 'rule') {
      // Update alert rule
      const { ruleId, updates } = body;
      
      if (!ruleId || !updates) {
        return NextResponse.json({
          success: false,
          error: 'Rule ID and updates are required'
        }, { status: 400 });
      }
      
      const success = await alertingSystem.updateAlertRule(ruleId, updates);
      
      if (!success) {
        return NextResponse.json({
          success: false,
          error: 'Alert rule not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Alert rule updated successfully'
      });
    }
    
    if (type === 'channel') {
      // Update notification channel
      const { channelType, updates } = body;
      
      if (!channelType || !updates) {
        return NextResponse.json({
          success: false,
          error: 'Channel type and updates are required'
        }, { status: 400 });
      }
      
      const success = await alertingSystem.updateChannel(channelType, updates);
      
      if (!success) {
        return NextResponse.json({
          success: false,
          error: 'Notification channel not found'
        }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        message: 'Notification channel updated successfully'
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid type parameter'
    }, { status: 400 });
    
  } catch (error) {
    logger.error('Failed to update alert configuration', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });
    
    return NextResponse.json({
      success: false,
      error: 'Failed to update configuration'
    }, { status: 500 });
  }
}