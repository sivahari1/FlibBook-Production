# JStudyRoom Document Viewing Fix - Admin Tools Documentation

## Overview

This document provides comprehensive guidance for administrators managing the JStudyRoom document viewing system. It covers conversion management tools, monitoring dashboards, and troubleshooting procedures to ensure optimal system performance and user experience.

## Table of Contents

1. [Conversion Management Tools](#conversion-management-tools)
2. [Monitoring Dashboard Usage](#monitoring-dashboard-usage)
3. [Troubleshooting Procedures](#troubleshooting-procedures)
4. [API Reference](#api-reference)
5. [Scripts and Utilities](#scripts-and-utilities)
6. [Best Practices](#best-practices)

---

## Conversion Management Tools

### Manual Conversion Trigger

The Manual Conversion Trigger allows administrators to manually initiate document conversion when automatic processes fail or when prioritizing specific documents.

#### Accessing the Tool

The Manual Conversion Trigger is available as a React component that can be integrated into admin interfaces:

```typescript
import { ManualConversionTrigger } from '@/components/conversion/ManualConversionTrigger';

// Usage in admin interface
<ManualConversionTrigger
  documentId="doc-123"
  onConversionStarted={(result) => {
    console.log('Conversion started:', result);
  }}
/>
```

#### Features

1. **Priority Selection**
   - **High Priority**: Process immediately (for urgent documents)
   - **Normal Priority**: Standard processing time
   - **Low Priority**: Process when system is less busy

2. **Force Reconversion**
   - Option to reconvert documents that already have pages
   - Useful when previous conversion had issues
   - Requires admin privileges

3. **Queue Status Display**
   - Current queue depth
   - Active conversion jobs
   - Estimated wait time

4. **Conversion Tracking**
   - Real-time progress updates
   - Conversion job ID for tracking
   - Queue position information

#### Usage Guidelines

1. **When to Use Manual Conversion**
   - Automatic conversion fails repeatedly
   - User reports document viewing issues
   - Need to prioritize specific documents
   - Previous conversion produced poor quality results

2. **Priority Selection Guidelines**
   - **High**: Critical business documents, user complaints
   - **Normal**: Regular document processing
   - **Low**: Batch processing, non-urgent documents

3. **Force Reconversion Guidelines**
   - Use when pages exist but are corrupted
   - When document was updated but pages weren't regenerated
   - When conversion settings have changed

### Conversion API Endpoints

#### Trigger Manual Conversion

```http
POST /api/documents/{documentId}/convert
Content-Type: application/json

{
  "priority": "high|normal|low",
  "force": boolean,
  "reason": "Optional reason for manual conversion"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "doc-123",
    "conversionId": "conv-456",
    "priority": "high",
    "queue": {
      "position": 1,
      "estimatedWaitTime": 30000,
      "estimatedWaitTimeFormatted": "30 seconds"
    },
    "status": {
      "stage": "queued",
      "progress": 0,
      "message": "Conversion queued for processing"
    }
  }
}
```

#### Check Conversion Status

```http
GET /api/documents/{documentId}/convert
```

**Response:**
```json
{
  "success": true,
  "data": {
    "documentId": "doc-123",
    "documentTitle": "Sample Document",
    "contentType": "application/pdf",
    "convertible": true,
    "existingPages": 0,
    "hasPages": false,
    "currentConversion": {
      "jobId": "conv-456",
      "status": "processing",
      "progress": 45,
      "estimatedCompletion": "2024-12-17T15:30:00Z",
      "startedAt": "2024-12-17T15:25:00Z"
    },
    "queue": {
      "depth": 5,
      "activeJobs": 2,
      "averageProcessingTime": 120000,
      "estimatedWaitTime": 60000
    }
  }
}
```

### Batch Conversion Management

#### Batch Conversion API

```http
POST /api/conversion/batch
Content-Type: application/json

{
  "documentIds": ["doc-1", "doc-2", "doc-3"],
  "priority": "normal",
  "maxConcurrent": 3,
  "force": false
}
```

#### Monitor Batch Progress

```http
GET /api/conversion/batch/{batchId}
```

---

## Monitoring Dashboard Usage

### Performance Dashboard

The Performance Dashboard provides real-time metrics and historical statistics for the document viewing system.

#### Accessing the Dashboard

```typescript
import { PerformanceDashboard } from '@/components/monitoring/PerformanceDashboard';

// Usage in admin interface
<PerformanceDashboard
  autoRefresh={true}
  refreshInterval={30000}
  showExportButton={true}
/>
```

#### Key Metrics

1. **Real-time Metrics**
   - Active conversions
   - Queue depth
   - Current error rate
   - Average response time

2. **Historical Statistics**
   - Document loading success rate
   - Average load time
   - Average conversion time
   - Error breakdown by type

3. **System Health Indicators**
   - Error rate status (healthy < 5%)
   - Response time status (healthy < 5 seconds)
   - Queue depth status (healthy < 50 jobs)

#### Dashboard Features

1. **Auto-refresh**: Automatically updates every 30 seconds
2. **Date Range Selection**: View historical data for specific periods
3. **Export Functionality**: Download metrics as JSON for analysis
4. **Color-coded Status**: Green (healthy), Red (alert)

#### Performance Thresholds

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Error Rate | < 5% | 5-10% | > 10% |
| Response Time | < 3s | 3-5s | > 5s |
| Queue Depth | < 25 | 25-50 | > 50 |
| Success Rate | > 99% | 95-99% | < 95% |

### Alerts Management

The Alerts Management system provides comprehensive monitoring and notification capabilities.

#### Accessing Alerts Management

```typescript
import AlertsManagement from '@/components/monitoring/AlertsManagement';

// Usage in admin interface
<AlertsManagement />
```

#### Alert Types

1. **Conversion Failure Rate**
   - Threshold: > 5%
   - Severity: High
   - Action: Investigate conversion pipeline

2. **Average Load Time**
   - Threshold: > 5 seconds
   - Severity: Medium
   - Action: Check system performance

3. **Queue Depth**
   - Threshold: > 50 jobs
   - Severity: High
   - Action: Scale conversion workers

4. **Error Rate**
   - Threshold: > 5%
   - Severity: Critical
   - Action: Immediate investigation required

#### Alert Management Features

1. **Alert Filtering**
   - Filter by status (resolved/unresolved)
   - Filter by severity (low/medium/high/critical)
   - Filter by metric type

2. **Alert Statistics**
   - Total alerts count
   - Unresolved alerts
   - Escalated alerts
   - Breakdown by severity and metric

3. **Notification Testing**
   - Test all notification channels
   - Verify email, Slack, webhook delivery
   - Console logging for debugging

#### Notification Channels

1. **Email Notifications**
   - HTML formatted alerts
   - Severity-based color coding
   - Automatic escalation

2. **Slack Integration**
   - Rich message formatting
   - Channel-based routing
   - Thread-based updates

3. **Webhook Support**
   - Custom integrations
   - JSON payload delivery
   - Retry mechanisms

4. **Console Logging**
   - Development and debugging
   - Structured log format
   - Severity indicators

### Monitoring API Endpoints

#### Get Real-time Metrics

```http
GET /api/monitoring/performance
```

#### Get Historical Statistics

```http
GET /api/monitoring/performance?type=stats&startDate=2024-12-01T00:00:00Z&endDate=2024-12-17T23:59:59Z
```

#### Get Alerts

```http
GET /api/monitoring/alerts?resolved=false&severity=high&limit=50
```

#### Test Notifications

```http
POST /api/monitoring/alerts?action=test
```

---

## Troubleshooting Procedures

### Common Issues and Solutions

#### 1. Documents Stuck in Loading State

**Symptoms:**
- Document shows "Loading PDF content..." indefinitely
- Progress indicator remains at 0%
- No error messages displayed

**Diagnosis Steps:**
1. Check if document has converted pages:
   ```http
   GET /api/documents/{documentId}/pages
   ```

2. Verify document conversion status:
   ```http
   GET /api/documents/{documentId}/convert
   ```

3. Check conversion queue status:
   ```http
   GET /api/conversion/status
   ```

**Solutions:**
1. **No Pages Available:**
   - Trigger manual conversion with high priority
   - Monitor conversion progress
   - Check for conversion errors

2. **Conversion Failed:**
   - Review error logs
   - Attempt force reconversion
   - Verify document integrity

3. **Queue Backlog:**
   - Scale conversion workers
   - Prioritize critical documents
   - Clear failed jobs from queue

#### 2. High Conversion Failure Rate

**Symptoms:**
- Alert: Conversion failure rate > 5%
- Multiple documents failing conversion
- User complaints about document access

**Diagnosis Steps:**
1. Check conversion analytics:
   ```http
   GET /api/analytics/conversion
   ```

2. Review error patterns:
   ```http
   GET /api/monitoring/alerts?metric=conversion_failure_rate
   ```

3. Examine failed conversion logs

**Solutions:**
1. **PDF Corruption Issues:**
   - Validate source documents
   - Implement PDF repair tools
   - Provide alternative access methods

2. **Resource Constraints:**
   - Scale conversion infrastructure
   - Optimize memory usage
   - Implement queue management

3. **Configuration Issues:**
   - Review conversion settings
   - Update PDF.js configuration
   - Check storage permissions

#### 3. Performance Degradation

**Symptoms:**
- Slow document loading times
- High response times
- User experience complaints

**Diagnosis Steps:**
1. Check performance metrics:
   ```http
   GET /api/monitoring/performance
   ```

2. Analyze system resources:
   - CPU usage
   - Memory consumption
   - Storage I/O

3. Review caching effectiveness

**Solutions:**
1. **Caching Issues:**
   - Clear and rebuild caches
   - Optimize cache strategies
   - Implement CDN caching

2. **Resource Bottlenecks:**
   - Scale infrastructure
   - Optimize database queries
   - Implement load balancing

3. **Network Issues:**
   - Check CDN performance
   - Optimize image compression
   - Implement progressive loading

### Diagnostic Scripts

#### 1. System Health Check

```bash
# Run comprehensive system diagnostic
npm run script scripts/diagnose-jstudyroom-viewing-issue.ts
```

**What it checks:**
- Database connectivity
- Document pages availability
- Storage access
- Conversion status

#### 2. Performance Analysis

```bash
# Analyze system performance
npm run script scripts/verify-fast-reliable-operation.ts
```

**What it analyzes:**
- Response times
- Success rates
- Error patterns
- Resource usage

#### 3. Alerting System Setup

```bash
# Configure alerting system
npm run script scripts/setup-alerting-system.ts
```

**What it configures:**
- Alert rules and thresholds
- Notification channels
- Test notifications
- Escalation policies

### Log Analysis

#### Key Log Locations

1. **Conversion Logs**
   - Location: Application logs with `conversion` tag
   - Contains: Job status, progress, errors
   - Format: Structured JSON

2. **Performance Logs**
   - Location: Application logs with `performance` tag
   - Contains: Metrics, timings, resource usage
   - Format: Structured JSON

3. **Error Logs**
   - Location: Application logs with `error` tag
   - Contains: Stack traces, context, user impact
   - Format: Structured JSON with error details

#### Log Analysis Queries

1. **Find Conversion Failures:**
   ```
   level:error AND tags:conversion AND message:"conversion failed"
   ```

2. **Performance Issues:**
   ```
   tags:performance AND duration:>5000
   ```

3. **User Impact Analysis:**
   ```
   tags:user-experience AND level:error
   ```

---

## API Reference

### Conversion Management APIs

#### Document Conversion

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/{id}/convert` | GET | Get conversion options and status |
| `/api/documents/{id}/convert` | POST | Trigger manual conversion |
| `/api/conversion/status` | GET | Get overall conversion status |
| `/api/conversion/queue` | GET | Get queue information |
| `/api/conversion/batch` | POST | Start batch conversion |
| `/api/conversion/batch/{id}` | GET | Get batch status |
| `/api/conversion/cache` | GET | Get cache statistics |
| `/api/conversion/cache` | POST | Warm cache for documents |
| `/api/conversion/cache` | DELETE | Clear conversion cache |

#### Monitoring APIs

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/monitoring/performance` | GET | Get performance metrics |
| `/api/monitoring/performance` | POST | Record performance data |
| `/api/monitoring/performance` | DELETE | Clean old metrics |
| `/api/monitoring/alerts` | GET | Get alerts with filtering |
| `/api/monitoring/alerts` | POST | Test notifications or trigger alerts |

### Response Formats

#### Standard Success Response

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Optional success message",
  "timestamp": "2024-12-17T15:30:00Z"
}
```

#### Standard Error Response

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {
    // Additional error details
  },
  "timestamp": "2024-12-17T15:30:00Z"
}
```

---

## Scripts and Utilities

### Available Scripts

#### 1. Diagnostic Scripts

```bash
# Comprehensive system diagnostic
npm run script scripts/diagnose-jstudyroom-viewing-issue.ts

# Document state analysis
npm run script scripts/diagnose-document-state.ts

# Performance verification
npm run script scripts/verify-fast-reliable-operation.ts
```

#### 2. Conversion Management Scripts

```bash
# Fix document viewing issues
npm run script scripts/fix-jstudyroom-document-viewing.ts

# Reconvert blank documents
npm run script scripts/reconvert-blank-documents.ts

# Batch document conversion
npm run script scripts/convert-documents-simple.ts
```

#### 3. Monitoring Setup Scripts

```bash
# Setup alerting system
npm run script scripts/setup-alerting-system.ts

# Verify monitoring configuration
npm run script scripts/verify-task-9-database-enhancements.ts
```

### Script Usage Examples

#### Diagnose Specific Document

```bash
# Check specific document issues
npm run script scripts/diagnose-document-state.ts -- --documentId=doc-123
```

#### Batch Reconversion

```bash
# Reconvert all documents without pages
npm run script scripts/reconvert-blank-documents.ts -- --force=true
```

#### Performance Testing

```bash
# Run performance benchmarks
npm run script scripts/verify-fast-reliable-operation.ts -- --concurrent=50
```

---

## Best Practices

### Conversion Management

1. **Priority Management**
   - Use high priority sparingly for critical documents
   - Batch low-priority conversions during off-peak hours
   - Monitor queue depth to prevent backlog

2. **Error Handling**
   - Always provide reason for manual conversions
   - Document recurring issues for pattern analysis
   - Implement automatic retry for transient failures

3. **Resource Management**
   - Monitor system resources during batch operations
   - Scale conversion workers based on queue depth
   - Implement circuit breakers for failing services

### Monitoring and Alerting

1. **Alert Configuration**
   - Set appropriate thresholds based on historical data
   - Implement escalation for unresolved alerts
   - Test notification channels regularly

2. **Performance Monitoring**
   - Monitor key metrics continuously
   - Set up automated reports for stakeholders
   - Analyze trends to predict capacity needs

3. **Log Management**
   - Implement structured logging for better analysis
   - Set up log retention policies
   - Use log aggregation for centralized monitoring

### Troubleshooting

1. **Systematic Approach**
   - Start with automated diagnostics
   - Check recent changes and deployments
   - Analyze patterns in error reports

2. **Documentation**
   - Document all troubleshooting steps
   - Maintain runbooks for common issues
   - Share knowledge with team members

3. **Prevention**
   - Implement proactive monitoring
   - Regular system health checks
   - Capacity planning based on usage trends

### Security Considerations

1. **Access Control**
   - Restrict admin tool access to authorized personnel
   - Implement audit logging for admin actions
   - Use role-based permissions

2. **Data Protection**
   - Ensure secure handling of document data
   - Implement encryption for sensitive operations
   - Regular security audits

3. **Compliance**
   - Follow data retention policies
   - Implement privacy controls
   - Document compliance procedures

---

## Support and Escalation

### Internal Support Process

1. **Level 1: Self-Service**
   - Use diagnostic scripts
   - Check monitoring dashboards
   - Review troubleshooting procedures

2. **Level 2: Admin Tools**
   - Manual conversion triggers
   - Performance analysis
   - Log analysis

3. **Level 3: Development Team**
   - Code-level debugging
   - Infrastructure changes
   - Feature enhancements

### External Support

1. **User Communication**
   - Provide clear status updates
   - Set realistic expectations
   - Offer alternative solutions

2. **Escalation Criteria**
   - System-wide outages
   - Data integrity issues
   - Security incidents

3. **Documentation Requirements**
   - Incident reports
   - Root cause analysis
   - Prevention measures

---

## Appendix

### Configuration Files

#### Alert Rules Configuration

```json
{
  "rules": [
    {
      "name": "High Conversion Failure Rate",
      "metric": "conversion_failure_rate",
      "threshold": 5,
      "comparison": "greater_than",
      "severity": "high",
      "enabled": true,
      "throttleMinutes": 15,
      "escalationMinutes": 60
    }
  ]
}
```

#### Notification Channels Configuration

```json
{
  "channels": {
    "email": {
      "enabled": true,
      "config": {
        "from": "alerts@jstudyroom.com",
        "to": ["admin@jstudyroom.com"],
        "subject": "JStudyRoom Alert: {{severity}} - {{metric}}"
      },
      "severityFilter": ["medium", "high", "critical"]
    },
    "slack": {
      "enabled": true,
      "config": {
        "webhookUrl": "https://hooks.slack.com/...",
        "channel": "#alerts",
        "username": "JStudyRoom Alerts"
      },
      "severityFilter": ["high", "critical"]
    }
  }
}
```

### Useful Queries

#### Database Queries

```sql
-- Find documents without pages
SELECT d.id, d.title, d.created_at
FROM documents d
LEFT JOIN document_pages dp ON d.id = dp.document_id
WHERE dp.document_id IS NULL
AND d.content_type = 'application/pdf';

-- Conversion job statistics
SELECT 
  status,
  COUNT(*) as count,
  AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration
FROM conversion_jobs
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY status;
```

#### Log Queries

```bash
# Find recent conversion errors
grep -E "conversion.*error" /var/log/app.log | tail -20

# Performance analysis
grep -E "performance.*slow" /var/log/app.log | awk '{print $1, $2, $NF}'
```

This documentation provides comprehensive guidance for administrators managing the JStudyRoom document viewing system. Regular updates should be made as new features are added or procedures change.