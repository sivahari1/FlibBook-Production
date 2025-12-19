# JStudyRoom Document Viewing Fix - Deployment and Maintenance Guide

## Overview

This guide provides comprehensive instructions for deploying, maintaining, and troubleshooting the JStudyRoom document viewing system. It covers deployment procedures, monitoring setup, maintenance tasks, and operational procedures.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Deployment Procedures](#deployment-procedures)
3. [Post-Deployment Verification](#post-deployment-verification)
4. [Monitoring Setup](#monitoring-setup)
5. [Maintenance Tasks](#maintenance-tasks)
6. [Troubleshooting Guide](#troubleshooting-guide)
7. [Rollback Procedures](#rollback-procedures)
8. [Performance Tuning](#performance-tuning)
9. [Security Maintenance](#security-maintenance)
10. [Disaster Recovery](#disaster-recovery)

## Pre-Deployment Checklist

### Environment Preparation

#### Database Requirements
- [ ] PostgreSQL 14+ with required extensions
- [ ] Database connection pooling configured (recommended: 20-50 connections)
- [ ] Backup strategy in place
- [ ] Migration scripts tested in staging

```bash
# Verify database readiness
npm run db:check
npm run db:migrate:dry-run
```

#### Storage Requirements
- [ ] Supabase storage buckets configured
- [ ] CORS policies updated for document pages
- [ ] Storage quotas and limits configured
- [ ] CDN configuration for page delivery

```bash
# Verify storage configuration
npm run storage:verify
npm run storage:test-upload
```

#### Infrastructure Requirements
- [ ] Node.js 18+ runtime environment
- [ ] Redis instance for caching (optional but recommended)
- [ ] WebSocket support enabled
- [ ] SSL certificates valid and configured
- [ ] Load balancer health checks configured

#### Environment Variables

```bash
# Core application
DATABASE_URL=postgresql://user:pass@host:5432/dbname
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://your-domain.com

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Storage configuration
SUPABASE_STORAGE_BUCKET=document-pages
SUPABASE_STORAGE_URL=https://your-project.supabase.co/storage/v1

# Monitoring and alerting
RESEND_API_KEY=your-resend-key
SLACK_WEBHOOK_URL=https://hooks.slack.com/your-webhook
MONITORING_ENABLED=true

# Performance settings
CONVERSION_QUEUE_SIZE=100
MAX_CONCURRENT_CONVERSIONS=5
CACHE_TTL_SECONDS=604800
```

### Code Quality Checks

```bash
# Run all quality checks
npm run lint
npm run type-check
npm run test:unit
npm run test:integration
npm run test:e2e

# Security audit
npm audit
npm run security:check
```

### Performance Baseline

```bash
# Establish performance baseline
npm run perf:baseline
npm run load:test:light
```

## Deployment Procedures

### Production Deployment

#### 1. Pre-deployment Steps

```bash
# 1. Create deployment branch
git checkout -b deploy/$(date +%Y%m%d-%H%M%S)
git push origin deploy/$(date +%Y%m%d-%H%M%S)

# 2. Build and test
npm ci
npm run build
npm run test:production

# 3. Database migration (if needed)
npm run db:migrate:production
```

#### 2. Blue-Green Deployment

```bash
# Deploy to staging slot
vercel deploy --prod=false --env=staging

# Run smoke tests
npm run test:smoke:staging

# Switch traffic to new deployment
vercel promote --env=production
```

#### 3. Rolling Deployment (Alternative)

```bash
# Deploy with zero downtime
kubectl apply -f k8s/deployment.yaml
kubectl rollout status deployment/jstudyroom-app
```

### Staging Deployment

```bash
# Automated staging deployment
npm run deploy:staging

# Manual staging deployment
vercel deploy --env=staging
npm run test:staging
```

### Development Deployment

```bash
# Local development setup
npm install
npm run dev

# Development environment deployment
npm run deploy:dev
```

## Post-Deployment Verification

### Automated Health Checks

```bash
# Run comprehensive health check
npm run health:check:full

# Specific component checks
npm run health:check:database
npm run health:check:storage
npm run health:check:api
npm run health:check:websocket
```

### Manual Verification Steps

#### 1. Core Functionality
- [ ] User can log in successfully
- [ ] Document list loads correctly
- [ ] Document viewing works for existing documents
- [ ] Document conversion triggers automatically for documents without pages
- [ ] Progress tracking displays correctly during conversion
- [ ] Error messages are clear and actionable

#### 2. Performance Verification
- [ ] First page loads within 2 seconds
- [ ] Subsequent pages load within 1 second
- [ ] Memory usage stays under 500MB per document
- [ ] WebSocket connections establish successfully
- [ ] Cache hit rates are above 80%

#### 3. Error Handling
- [ ] Network failures trigger appropriate retry logic
- [ ] Conversion failures show clear error messages
- [ ] Invalid documents are handled gracefully
- [ ] Rate limiting works correctly
- [ ] Security controls are functioning

### Monitoring Dashboard Setup

```bash
# Initialize monitoring dashboards
npm run monitoring:setup
npm run alerts:configure
npm run dashboards:deploy
```

## Monitoring Setup

### Key Metrics to Monitor

#### Application Metrics
```typescript
// Core business metrics
const metrics = {
  documentLoadingSuccessRate: 'percentage',
  averageDocumentLoadTime: 'milliseconds',
  conversionSuccessRate: 'percentage',
  averageConversionTime: 'seconds',
  errorRateByType: 'count per minute',
  activeUsers: 'count',
  queueDepth: 'count',
  cacheHitRate: 'percentage'
};
```

#### System Metrics
- CPU usage and memory consumption
- Database connection pool utilization
- Storage I/O and bandwidth usage
- WebSocket connection count
- API response times and error rates

### Alert Configuration

#### Critical Alerts (Immediate Response)
```yaml
alerts:
  - name: "Document Loading Failure Rate High"
    condition: "error_rate > 5%"
    severity: "critical"
    channels: ["slack", "email", "pagerduty"]
    
  - name: "Conversion Queue Backup"
    condition: "queue_depth > 100"
    severity: "critical"
    channels: ["slack", "email"]
    
  - name: "Database Connection Pool Exhausted"
    condition: "db_connections > 90%"
    severity: "critical"
    channels: ["slack", "email", "pagerduty"]
```

#### Warning Alerts (Monitor Closely)
```yaml
  - name: "Average Load Time High"
    condition: "avg_load_time > 5s"
    severity: "warning"
    channels: ["slack"]
    
  - name: "Cache Hit Rate Low"
    condition: "cache_hit_rate < 70%"
    severity: "warning"
    channels: ["slack"]
```

### Dashboard Configuration

```bash
# Deploy monitoring dashboards
npm run dashboards:deploy

# Available dashboards:
# - System Overview: High-level system health
# - Document Viewing: User experience metrics
# - Conversion Performance: Conversion system metrics
# - Error Analysis: Error tracking and analysis
# - Resource Utilization: Infrastructure metrics
```

## Maintenance Tasks

### Daily Tasks

#### Automated (via cron jobs)
```bash
# 00:00 UTC - Daily cleanup
0 0 * * * npm run maintenance:daily

# 02:00 UTC - Cache optimization
0 2 * * * npm run cache:optimize

# 04:00 UTC - Log rotation
0 4 * * * npm run logs:rotate
```

#### Manual Checks
- [ ] Review error logs for new issues
- [ ] Check system performance metrics
- [ ] Verify backup completion
- [ ] Monitor conversion queue status

### Weekly Tasks

```bash
# Weekly maintenance script
npm run maintenance:weekly

# Includes:
# - Database statistics update
# - Cache cleanup and optimization
# - Performance report generation
# - Security scan
# - Dependency updates check
```

#### Manual Tasks
- [ ] Review performance trends
- [ ] Analyze user feedback and support tickets
- [ ] Update documentation if needed
- [ ] Review and update alert thresholds
- [ ] Capacity planning review

### Monthly Tasks

```bash
# Monthly maintenance
npm run maintenance:monthly

# Includes:
# - Full system health check
# - Security audit
# - Performance optimization review
# - Disaster recovery test
# - Documentation review
```

#### Manual Tasks
- [ ] Review and update monitoring dashboards
- [ ] Conduct security review
- [ ] Update disaster recovery procedures
- [ ] Review and optimize database queries
- [ ] Plan capacity upgrades if needed

### Quarterly Tasks

- [ ] Major dependency updates
- [ ] Security penetration testing
- [ ] Disaster recovery drill
- [ ] Performance benchmark comparison
- [ ] Architecture review and optimization planning

## Troubleshooting Guide

### Common Issues and Solutions

#### 1. Document Loading Failures

**Symptoms:**
- Documents stuck at "Loading PDF content..."
- 0% progress indicator
- No error messages displayed

**Diagnosis:**
```bash
# Check document status
npm run debug:document <document-id>

# Check conversion job status
npm run debug:conversion <document-id>

# Verify storage access
npm run debug:storage <document-id>
```

**Solutions:**
1. **Missing Pages**: Trigger manual conversion
   ```bash
   npm run convert:manual <document-id>
   ```

2. **Storage Issues**: Refresh signed URLs
   ```bash
   npm run storage:refresh-urls <document-id>
   ```

3. **Database Inconsistency**: Repair document data
   ```bash
   npm run repair:document <document-id>
   ```

#### 2. Conversion Queue Backup

**Symptoms:**
- Long conversion times
- Queue depth alerts
- User complaints about slow processing

**Diagnosis:**
```bash
# Check queue status
npm run queue:status

# Check worker health
npm run workers:health

# Check resource usage
npm run system:resources
```

**Solutions:**
1. **Scale Workers**: Increase concurrent conversion limit
   ```bash
   # Temporarily increase capacity
   npm run queue:scale-up

   # Permanent scaling (update environment)
   export MAX_CONCURRENT_CONVERSIONS=10
   ```

2. **Clear Stuck Jobs**: Remove failed or stuck jobs
   ```bash
   npm run queue:clear-stuck
   ```

3. **Priority Adjustment**: Prioritize critical conversions
   ```bash
   npm run queue:prioritize <document-id>
   ```

#### 3. Performance Issues

**Symptoms:**
- Slow page loading
- High memory usage
- Timeout errors

**Diagnosis:**
```bash
# Performance analysis
npm run perf:analyze

# Memory usage check
npm run memory:check

# Database performance
npm run db:analyze
```

**Solutions:**
1. **Cache Optimization**:
   ```bash
   npm run cache:optimize
   npm run cache:warm-popular
   ```

2. **Database Optimization**:
   ```bash
   npm run db:optimize
   npm run db:reindex
   ```

3. **Resource Scaling**:
   ```bash
   # Scale application instances
   kubectl scale deployment jstudyroom-app --replicas=5
   ```

#### 4. WebSocket Connection Issues

**Symptoms:**
- Progress updates not working
- Connection timeouts
- Fallback to polling

**Diagnosis:**
```bash
# WebSocket health check
npm run websocket:health

# Connection diagnostics
npm run websocket:diagnose
```

**Solutions:**
1. **Restart WebSocket Service**:
   ```bash
   npm run websocket:restart
   ```

2. **Check Load Balancer Configuration**:
   ```bash
   # Verify sticky sessions and WebSocket support
   npm run lb:check-websocket
   ```

### Emergency Procedures

#### System Down (Complete Outage)

1. **Immediate Response**:
   ```bash
   # Check system status
   npm run status:check

   # Emergency restart
   npm run emergency:restart

   # Enable maintenance mode
   npm run maintenance:enable
   ```

2. **Communication**:
   - Post status update on status page
   - Notify users via email/social media
   - Update support team

3. **Investigation**:
   ```bash
   # Collect diagnostic information
   npm run emergency:diagnose

   # Check recent deployments
   git log --oneline -10

   # Review error logs
   npm run logs:emergency
   ```

#### Data Corruption

1. **Immediate Actions**:
   ```bash
   # Stop write operations
   npm run db:read-only

   # Create emergency backup
   npm run backup:emergency
   ```

2. **Assessment**:
   ```bash
   # Check data integrity
   npm run db:integrity-check

   # Identify affected documents
   npm run data:check-corruption
   ```

3. **Recovery**:
   ```bash
   # Restore from backup if needed
   npm run restore:from-backup <backup-id>

   # Repair corrupted data
   npm run data:repair
   ```

## Rollback Procedures

### Automated Rollback

```bash
# Quick rollback to previous version
npm run rollback:auto

# Rollback to specific version
npm run rollback:to-version <version>
```

### Manual Rollback Steps

1. **Identify Rollback Target**:
   ```bash
   # List recent deployments
   vercel list

   # Check deployment history
   git log --oneline -10
   ```

2. **Database Rollback** (if needed):
   ```bash
   # Rollback database migrations
   npm run db:rollback

   # Restore database backup
   npm run db:restore <backup-timestamp>
   ```

3. **Application Rollback**:
   ```bash
   # Rollback application deployment
   vercel rollback <deployment-url>

   # Or using Kubernetes
   kubectl rollout undo deployment/jstudyroom-app
   ```

4. **Verification**:
   ```bash
   # Verify rollback success
   npm run health:check
   npm run test:smoke
   ```

### Rollback Decision Matrix

| Issue Severity | Rollback Trigger | Action |
|----------------|------------------|--------|
| Critical | Error rate > 10% | Immediate automated rollback |
| High | Error rate > 5% | Manual rollback within 15 minutes |
| Medium | Performance degradation > 50% | Evaluate and rollback if needed |
| Low | Minor issues | Fix forward, no rollback |

## Performance Tuning

### Database Optimization

#### Query Optimization
```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_document_pages_document_id_page_num 
ON document_pages(document_id, page_number);

CREATE INDEX CONCURRENTLY idx_conversion_jobs_status_created 
ON conversion_jobs(status, created_at);

-- Update table statistics
ANALYZE document_pages;
ANALYZE conversion_jobs;
```

#### Connection Pool Tuning
```javascript
// Database connection pool configuration
const poolConfig = {
  min: 5,
  max: 20,
  acquireTimeoutMillis: 30000,
  createTimeoutMillis: 30000,
  destroyTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  reapIntervalMillis: 1000,
  createRetryIntervalMillis: 200
};
```

### Application Performance

#### Memory Optimization
```bash
# Monitor memory usage
npm run memory:monitor

# Optimize garbage collection
export NODE_OPTIONS="--max-old-space-size=2048 --optimize-for-size"

# Enable memory profiling
npm run profile:memory
```

#### Cache Optimization
```bash
# Optimize cache configuration
npm run cache:tune

# Warm cache with popular content
npm run cache:warm-popular

# Monitor cache performance
npm run cache:stats
```

### Infrastructure Scaling

#### Horizontal Scaling
```bash
# Scale application instances
kubectl scale deployment jstudyroom-app --replicas=5

# Auto-scaling configuration
kubectl apply -f k8s/hpa.yaml
```

#### Vertical Scaling
```bash
# Increase resource limits
kubectl patch deployment jstudyroom-app -p '{"spec":{"template":{"spec":{"containers":[{"name":"app","resources":{"limits":{"memory":"2Gi","cpu":"1000m"}}}]}}}}'
```

## Security Maintenance

### Regular Security Tasks

#### Weekly Security Checks
```bash
# Security audit
npm audit
npm run security:scan

# Check for vulnerable dependencies
npm run deps:check-vulnerabilities

# Review access logs
npm run logs:security-review
```

#### Monthly Security Tasks
```bash
# Update security dependencies
npm run security:update

# Review user access permissions
npm run access:review

# Check SSL certificate expiration
npm run ssl:check
```

### Security Incident Response

#### Suspected Security Breach
1. **Immediate Actions**:
   ```bash
   # Enable security monitoring
   npm run security:monitor-enable

   # Collect security logs
   npm run logs:security-collect

   # Notify security team
   npm run security:alert
   ```

2. **Investigation**:
   ```bash
   # Analyze access patterns
   npm run security:analyze-access

   # Check for unauthorized changes
   npm run security:check-integrity
   ```

3. **Containment**:
   ```bash
   # Revoke suspicious sessions
   npm run auth:revoke-sessions

   # Update security keys
   npm run security:rotate-keys
   ```

## Disaster Recovery

### Backup Strategy

#### Automated Backups
```bash
# Daily database backup
0 2 * * * npm run backup:database

# Weekly full system backup
0 3 * * 0 npm run backup:full

# Continuous storage backup (via Supabase)
# Configured in Supabase dashboard
```

#### Backup Verification
```bash
# Test backup integrity
npm run backup:verify

# Test restore procedure
npm run backup:test-restore
```

### Recovery Procedures

#### Database Recovery
```bash
# Restore from latest backup
npm run restore:database:latest

# Restore from specific backup
npm run restore:database <backup-id>

# Point-in-time recovery
npm run restore:database:pit <timestamp>
```

#### Full System Recovery
```bash
# Complete system restore
npm run restore:full <backup-id>

# Verify system integrity
npm run system:verify

# Resume normal operations
npm run maintenance:disable
```

### Recovery Time Objectives (RTO)

| Component | RTO Target | Recovery Procedure |
|-----------|------------|-------------------|
| Application | 15 minutes | Automated failover |
| Database | 30 minutes | Backup restore |
| Storage | 5 minutes | CDN failover |
| Full System | 1 hour | Complete restore |

## Maintenance Scripts

### Available Scripts

```bash
# Health and diagnostics
npm run health:check          # Comprehensive health check
npm run debug:document <id>   # Debug specific document
npm run debug:conversion <id> # Debug conversion job
npm run system:status         # System status overview

# Maintenance operations
npm run maintenance:daily     # Daily maintenance tasks
npm run maintenance:weekly    # Weekly maintenance tasks
npm run cache:optimize        # Optimize cache performance
npm run db:optimize          # Database optimization

# Emergency operations
npm run emergency:restart     # Emergency system restart
npm run emergency:diagnose    # Emergency diagnostics
npm run rollback:auto        # Automated rollback
npm run backup:emergency     # Emergency backup

# Performance and monitoring
npm run perf:analyze         # Performance analysis
npm run memory:check         # Memory usage check
npm run monitoring:setup     # Setup monitoring
npm run alerts:test          # Test alert system
```

### Custom Maintenance Scripts

Create custom maintenance scripts in `scripts/maintenance/`:

```typescript
// scripts/maintenance/custom-check.ts
import { performanceMonitor } from '../lib/monitoring';
import { logger } from '../lib/logger';

export async function customMaintenanceCheck() {
  logger.info('Starting custom maintenance check');
  
  // Custom maintenance logic here
  const metrics = await performanceMonitor.getMetrics();
  
  if (metrics.errorRate > 0.05) {
    logger.warn('High error rate detected', { errorRate: metrics.errorRate });
    // Trigger alerts or corrective actions
  }
  
  logger.info('Custom maintenance check completed');
}
```

## Support and Escalation

### Support Contacts

- **Development Team**: dev-team@jstudyroom.com
- **DevOps Team**: devops@jstudyroom.com
- **Security Team**: security@jstudyroom.com
- **On-call Engineer**: +1-555-ON-CALL

### Escalation Matrix

| Severity | Response Time | Escalation |
|----------|---------------|------------|
| Critical | 15 minutes | Immediate escalation to on-call |
| High | 1 hour | Escalate if not resolved in 2 hours |
| Medium | 4 hours | Escalate if not resolved in 8 hours |
| Low | 24 hours | Standard support process |

### Documentation and Resources

- **Runbooks**: `/docs/runbooks/`
- **API Documentation**: `/docs/api/`
- **Architecture Docs**: `/docs/architecture/`
- **Troubleshooting**: `/docs/troubleshooting/`
- **Status Page**: https://status.jstudyroom.com

---

*This guide is maintained by the DevOps team and updated regularly. Last updated: December 17, 2024*