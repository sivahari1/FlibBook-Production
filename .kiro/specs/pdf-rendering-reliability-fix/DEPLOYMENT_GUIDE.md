# PDF Rendering Reliability Fix - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the PDF Rendering Reliability Fix system, including rollout strategies, configuration management, monitoring setup, and rollback procedures.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Environment Setup](#environment-setup)
- [Configuration Management](#configuration-management)
- [Deployment Strategies](#deployment-strategies)
- [Rollout Plan](#rollout-plan)
- [Monitoring and Alerting](#monitoring-and-alerting)
- [Testing and Validation](#testing-and-validation)
- [Rollback Procedures](#rollback-procedures)
- [Post-Deployment Tasks](#post-deployment-tasks)
- [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

### Code Readiness

- [ ] All tests passing (unit, integration, property-based)
- [ ] Code review completed and approved
- [ ] Performance benchmarks meet targets
- [ ] Security audit completed
- [ ] Documentation updated
- [ ] Configuration validated

### Infrastructure Readiness

- [ ] Target environments provisioned
- [ ] Database migrations prepared (if applicable)
- [ ] CDN configuration updated
- [ ] Load balancer configuration verified
- [ ] SSL certificates valid
- [ ] Monitoring systems configured

### Dependencies

- [ ] PDF.js worker files deployed to CDN
- [ ] Required environment variables configured
- [ ] External service endpoints verified
- [ ] Network connectivity tested
- [ ] CORS policies updated

### Team Readiness

- [ ] Deployment team briefed
- [ ] Support team trained
- [ ] Rollback procedures documented
- [ ] Communication plan established
- [ ] Incident response plan updated

## Environment Setup

### Development Environment

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Configure development settings
cat > .env.local << EOF
NODE_ENV=development
NEXT_PUBLIC_PDF_RELIABILITY_DIAGNOSTICS=verbose
NEXT_PUBLIC_PDF_RELIABILITY_PERFORMANCE_MONITORING=true
DISABLE_SERVER_CONVERSION=false
ENABLE_USER_FEEDBACK=true
EOF

# Start development server
npm run dev
```

### Staging Environment

```bash
# Build application
npm run build

# Set up staging configuration
cat > .env.staging << EOF
NODE_ENV=staging
NEXT_PUBLIC_PDF_RELIABILITY_DIAGNOSTICS=info
NEXT_PUBLIC_PDF_RELIABILITY_PERFORMANCE_MONITORING=true
DIAGNOSTICS_ENDPOINT=https://staging-api.example.com/diagnostics
DISABLE_PDFJS_CANVAS=false
DISABLE_NATIVE_BROWSER=false
MEMORY_PRESSURE_THRESHOLD=100
PROGRESS_UPDATE_INTERVAL=1000
EOF

# Deploy to staging
npm run deploy:staging
```

### Production Environment

```bash
# Build optimized production bundle
npm run build:production

# Set up production configuration
cat > .env.production << EOF
NODE_ENV=production
NEXT_PUBLIC_PDF_RELIABILITY_DIAGNOSTICS=error
NEXT_PUBLIC_PDF_RELIABILITY_PERFORMANCE_MONITORING=true
DIAGNOSTICS_ENDPOINT=https://api.example.com/diagnostics
DISABLE_USER_FEEDBACK=true
MEMORY_PRESSURE_THRESHOLD=100
PROGRESS_UPDATE_INTERVAL=2000
RENDERING_QUALITY_PREFERENCE=speed
EOF

# Deploy to production
npm run deploy:production
```

## Configuration Management

### Environment Variables

| Variable | Development | Staging | Production | Description |
|----------|-------------|---------|------------|-------------|
| `NODE_ENV` | development | staging | production | Environment identifier |
| `NEXT_PUBLIC_PDF_RELIABILITY_DIAGNOSTICS` | verbose | info | error | Diagnostic level |
| `NEXT_PUBLIC_PDF_RELIABILITY_PERFORMANCE_MONITORING` | true | true | true | Enable performance monitoring |
| `DIAGNOSTICS_ENDPOINT` | - | staging-url | prod-url | Diagnostics collection endpoint |
| `DISABLE_PDFJS_CANVAS` | false | false | false | Disable PDF.js canvas rendering |
| `DISABLE_NATIVE_BROWSER` | false | false | false | Disable native browser rendering |
| `DISABLE_SERVER_CONVERSION` | false | false | false | Disable server-side conversion |
| `ENABLE_USER_FEEDBACK` | true | false | false | Enable user feedback collection |
| `MEMORY_PRESSURE_THRESHOLD` | 150 | 100 | 100 | Memory pressure threshold (MB) |
| `PROGRESS_UPDATE_INTERVAL` | 500 | 1000 | 2000 | Progress update interval (ms) |
| `RENDERING_QUALITY_PREFERENCE` | quality | balanced | speed | Rendering quality preference |

### Configuration Validation

```typescript
// config-validator.ts
export function validateDeploymentConfig(): void {
  const requiredVars = [
    'NODE_ENV',
    'NEXT_PUBLIC_PDF_RELIABILITY_DIAGNOSTICS',
  ];
  
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Validate diagnostic level
  const validLevels = ['none', 'error', 'warn', 'info', 'debug', 'verbose'];
  const diagnosticLevel = process.env.NEXT_PUBLIC_PDF_RELIABILITY_DIAGNOSTICS;
  if (diagnosticLevel && !validLevels.includes(diagnosticLevel)) {
    throw new Error(`Invalid diagnostic level: ${diagnosticLevel}`);
  }
  
  // Validate numeric values
  const numericVars = {
    MEMORY_PRESSURE_THRESHOLD: { min: 10, max: 1000 },
    PROGRESS_UPDATE_INTERVAL: { min: 100, max: 10000 },
  };
  
  Object.entries(numericVars).forEach(([varName, { min, max }]) => {
    const value = process.env[varName];
    if (value) {
      const numValue = parseInt(value, 10);
      if (isNaN(numValue) || numValue < min || numValue > max) {
        throw new Error(`Invalid ${varName}: ${value} (must be between ${min} and ${max})`);
      }
    }
  });
  
  console.log('✅ Configuration validation passed');
}
```

### Feature Flag Management

```typescript
// feature-flags.ts
export interface FeatureFlagConfig {
  pdfReliabilityEnabled: boolean;
  fallbackMethodsEnabled: boolean;
  performanceMonitoringEnabled: boolean;
  userFeedbackEnabled: boolean;
  diagnosticsEnabled: boolean;
}

export function getFeatureFlags(): FeatureFlagConfig {
  return {
    pdfReliabilityEnabled: process.env.DISABLE_PDF_RELIABILITY !== 'true',
    fallbackMethodsEnabled: process.env.DISABLE_FALLBACK_METHODS !== 'true',
    performanceMonitoringEnabled: process.env.NEXT_PUBLIC_PDF_RELIABILITY_PERFORMANCE_MONITORING === 'true',
    userFeedbackEnabled: process.env.ENABLE_USER_FEEDBACK === 'true',
    diagnosticsEnabled: process.env.NEXT_PUBLIC_PDF_RELIABILITY_DIAGNOSTICS !== 'none',
  };
}

// Runtime feature flag validation
export function validateFeatureFlags(): void {
  const flags = getFeatureFlags();
  
  // Ensure at least one rendering method is enabled
  const hasRenderingMethod = flags.pdfReliabilityEnabled || flags.fallbackMethodsEnabled;
  if (!hasRenderingMethod) {
    console.warn('⚠️  No rendering methods enabled - PDF viewing may not work');
  }
  
  // Production safety checks
  if (process.env.NODE_ENV === 'production') {
    if (flags.userFeedbackEnabled) {
      console.warn('⚠️  User feedback enabled in production - consider privacy implications');
    }
    
    if (process.env.NEXT_PUBLIC_PDF_RELIABILITY_DIAGNOSTICS === 'verbose') {
      console.warn('⚠️  Verbose diagnostics enabled in production - may impact performance');
    }
  }
}
```

## Deployment Strategies

### Blue-Green Deployment

```bash
#!/bin/bash
# blue-green-deploy.sh

set -e

ENVIRONMENT=${1:-production}
NEW_VERSION=${2:-$(git rev-parse --short HEAD)}

echo "🚀 Starting blue-green deployment for $ENVIRONMENT"
echo "📦 Version: $NEW_VERSION"

# Build new version
echo "🔨 Building application..."
npm run build

# Deploy to green environment
echo "🟢 Deploying to green environment..."
kubectl apply -f k8s/green-deployment.yaml
kubectl set image deployment/pdf-app-green pdf-app=pdf-app:$NEW_VERSION

# Wait for green deployment to be ready
echo "⏳ Waiting for green deployment..."
kubectl rollout status deployment/pdf-app-green --timeout=300s

# Run health checks
echo "🏥 Running health checks..."
./scripts/health-check.sh green

# Switch traffic to green
echo "🔄 Switching traffic to green..."
kubectl patch service pdf-app-service -p '{"spec":{"selector":{"version":"green"}}}'

# Verify traffic switch
echo "✅ Verifying traffic switch..."
sleep 30
./scripts/health-check.sh production

# Clean up blue environment
echo "🔵 Cleaning up blue environment..."
kubectl delete deployment pdf-app-blue || true

echo "🎉 Blue-green deployment completed successfully!"
```

### Canary Deployment

```bash
#!/bin/bash
# canary-deploy.sh

set -e

ENVIRONMENT=${1:-production}
NEW_VERSION=${2:-$(git rev-parse --short HEAD)}
CANARY_PERCENTAGE=${3:-10}

echo "🚀 Starting canary deployment for $ENVIRONMENT"
echo "📦 Version: $NEW_VERSION"
echo "📊 Canary percentage: $CANARY_PERCENTAGE%"

# Deploy canary version
echo "🐤 Deploying canary version..."
kubectl apply -f k8s/canary-deployment.yaml
kubectl set image deployment/pdf-app-canary pdf-app=pdf-app:$NEW_VERSION

# Wait for canary deployment
echo "⏳ Waiting for canary deployment..."
kubectl rollout status deployment/pdf-app-canary --timeout=300s

# Configure traffic split
echo "🔄 Configuring traffic split..."
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1alpha3
kind: VirtualService
metadata:
  name: pdf-app-vs
spec:
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: pdf-app-canary
  - route:
    - destination:
        host: pdf-app-stable
      weight: $((100 - CANARY_PERCENTAGE))
    - destination:
        host: pdf-app-canary
      weight: $CANARY_PERCENTAGE
EOF

# Monitor canary metrics
echo "📊 Monitoring canary metrics..."
./scripts/monitor-canary.sh $CANARY_PERCENTAGE

# Promote or rollback based on metrics
if ./scripts/canary-decision.sh; then
  echo "✅ Canary metrics look good, promoting to stable"
  ./scripts/promote-canary.sh
else
  echo "❌ Canary metrics indicate issues, rolling back"
  ./scripts/rollback-canary.sh
fi
```

### Rolling Deployment

```bash
#!/bin/bash
# rolling-deploy.sh

set -e

ENVIRONMENT=${1:-production}
NEW_VERSION=${2:-$(git rev-parse --short HEAD)}

echo "🚀 Starting rolling deployment for $ENVIRONMENT"
echo "📦 Version: $NEW_VERSION"

# Update deployment with rolling strategy
echo "🔄 Updating deployment..."
kubectl set image deployment/pdf-app pdf-app=pdf-app:$NEW_VERSION

# Monitor rolling update
echo "⏳ Monitoring rolling update..."
kubectl rollout status deployment/pdf-app --timeout=600s

# Verify deployment
echo "✅ Verifying deployment..."
./scripts/health-check.sh $ENVIRONMENT

# Run smoke tests
echo "🧪 Running smoke tests..."
./scripts/smoke-tests.sh $ENVIRONMENT

echo "🎉 Rolling deployment completed successfully!"
```

## Rollout Plan

### Phase 1: Internal Testing (Week 1)

**Scope**: Development and staging environments only
**Duration**: 1 week
**Participants**: Development team, QA team

**Activities**:
1. Deploy to development environment
2. Run comprehensive test suite
3. Performance benchmarking
4. Security testing
5. Documentation review

**Success Criteria**:
- All tests passing
- Performance within acceptable limits
- No security vulnerabilities
- Documentation complete

**Rollback Trigger**:
- Any test failures
- Performance degradation > 20%
- Security issues identified

### Phase 2: Limited Production Rollout (Week 2)

**Scope**: 5% of production traffic
**Duration**: 1 week
**Participants**: Selected power users, support team

**Activities**:
1. Deploy canary version to production
2. Route 5% of traffic to new version
3. Monitor error rates and performance
4. Collect user feedback
5. Daily review meetings

**Success Criteria**:
- Error rate < 0.1%
- Performance within 10% of baseline
- No critical user issues
- Positive user feedback

**Rollback Trigger**:
- Error rate > 0.5%
- Performance degradation > 25%
- Critical user issues
- Negative user feedback trend

### Phase 3: Gradual Rollout (Week 3-4)

**Scope**: Gradual increase to 100% of traffic
**Duration**: 2 weeks
**Participants**: All users

**Traffic Distribution Schedule**:
- Day 1-2: 10% traffic
- Day 3-4: 25% traffic
- Day 5-7: 50% traffic
- Day 8-10: 75% traffic
- Day 11-14: 100% traffic

**Activities**:
1. Increase traffic percentage daily
2. Monitor metrics continuously
3. Respond to issues quickly
4. Collect performance data
5. Document lessons learned

**Success Criteria**:
- Stable error rates
- Performance improvements visible
- User satisfaction maintained
- Support ticket volume normal

**Rollback Trigger**:
- Sustained error rate increase
- Performance degradation
- Increased support tickets
- User complaints

### Phase 4: Full Deployment (Week 5)

**Scope**: 100% of production traffic
**Duration**: Ongoing
**Participants**: All users, operations team

**Activities**:
1. Complete traffic migration
2. Remove old version
3. Update monitoring baselines
4. Conduct post-deployment review
5. Plan future improvements

## Monitoring and Alerting

### Key Metrics to Monitor

#### Performance Metrics
```typescript
// monitoring-config.ts
export const PERFORMANCE_METRICS = {
  // Rendering performance
  'pdf.render.time.p95': { threshold: 10000, unit: 'ms' },
  'pdf.render.time.p99': { threshold: 20000, unit: 'ms' },
  'pdf.render.success_rate': { threshold: 0.95, unit: 'ratio' },
  
  // Memory usage
  'pdf.memory.peak': { threshold: 200 * 1024 * 1024, unit: 'bytes' },
  'pdf.memory.average': { threshold: 100 * 1024 * 1024, unit: 'bytes' },
  
  // Network performance
  'pdf.network.time.p95': { threshold: 5000, unit: 'ms' },
  'pdf.network.timeout_rate': { threshold: 0.05, unit: 'ratio' },
  
  // Error rates
  'pdf.error.rate': { threshold: 0.01, unit: 'ratio' },
  'pdf.fallback.rate': { threshold: 0.1, unit: 'ratio' },
};
```

#### Business Metrics
```typescript
export const BUSINESS_METRICS = {
  // User experience
  'pdf.user.satisfaction': { threshold: 4.0, unit: 'score' },
  'pdf.user.completion_rate': { threshold: 0.9, unit: 'ratio' },
  
  // System reliability
  'pdf.availability': { threshold: 0.999, unit: 'ratio' },
  'pdf.mttr': { threshold: 300, unit: 'seconds' },
  
  // Feature adoption
  'pdf.reliability.adoption': { threshold: 0.8, unit: 'ratio' },
  'pdf.fallback.usage': { threshold: 0.2, unit: 'ratio' },
};
```

### Alerting Configuration

```yaml
# alerts.yaml
groups:
- name: pdf-reliability
  rules:
  
  # Critical alerts
  - alert: PDFRenderingFailureHigh
    expr: pdf_render_error_rate > 0.05
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High PDF rendering failure rate"
      description: "PDF rendering error rate is {{ $value | humanizePercentage }} for the last 5 minutes"
      
  - alert: PDFRenderingSlowP95
    expr: pdf_render_time_p95 > 15000
    for: 10m
    labels:
      severity: critical
    annotations:
      summary: "PDF rendering is slow"
      description: "95th percentile render time is {{ $value }}ms for the last 10 minutes"
      
  - alert: PDFMemoryUsageHigh
    expr: pdf_memory_peak > 250000000
    for: 5m
    labels:
      severity: critical
    annotations:
      summary: "High PDF memory usage"
      description: "Peak memory usage is {{ $value | humanizeBytes }} for the last 5 minutes"
  
  # Warning alerts
  - alert: PDFRenderingFailureWarning
    expr: pdf_render_error_rate > 0.02
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Elevated PDF rendering failure rate"
      description: "PDF rendering error rate is {{ $value | humanizePercentage }} for the last 10 minutes"
      
  - alert: PDFFallbackRateHigh
    expr: pdf_fallback_rate > 0.15
    for: 15m
    labels:
      severity: warning
    annotations:
      summary: "High PDF fallback usage"
      description: "PDF fallback rate is {{ $value | humanizePercentage }} for the last 15 minutes"
```

### Dashboard Configuration

```json
{
  "dashboard": {
    "title": "PDF Rendering Reliability",
    "panels": [
      {
        "title": "Render Success Rate",
        "type": "stat",
        "targets": [
          {
            "expr": "pdf_render_success_rate",
            "legendFormat": "Success Rate"
          }
        ],
        "thresholds": [
          { "color": "red", "value": 0.95 },
          { "color": "yellow", "value": 0.98 },
          { "color": "green", "value": 0.99 }
        ]
      },
      {
        "title": "Render Time Distribution",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.50, pdf_render_time_bucket)",
            "legendFormat": "p50"
          },
          {
            "expr": "histogram_quantile(0.95, pdf_render_time_bucket)",
            "legendFormat": "p95"
          },
          {
            "expr": "histogram_quantile(0.99, pdf_render_time_bucket)",
            "legendFormat": "p99"
          }
        ]
      },
      {
        "title": "Error Rate by Type",
        "type": "graph",
        "targets": [
          {
            "expr": "rate(pdf_errors_total[5m]) by (error_type)",
            "legendFormat": "{{ error_type }}"
          }
        ]
      },
      {
        "title": "Memory Usage",
        "type": "graph",
        "targets": [
          {
            "expr": "pdf_memory_usage_bytes",
            "legendFormat": "Memory Usage"
          }
        ]
      }
    ]
  }
}
```

## Testing and Validation

### Pre-Deployment Testing

```bash
#!/bin/bash
# pre-deployment-tests.sh

set -e

echo "🧪 Running pre-deployment tests..."

# Unit tests
echo "Running unit tests..."
npm run test:unit

# Integration tests
echo "Running integration tests..."
npm run test:integration

# Property-based tests
echo "Running property-based tests..."
npm run test:property

# Performance tests
echo "Running performance benchmarks..."
npm run test:performance

# Security tests
echo "Running security tests..."
npm run test:security

# Browser compatibility tests
echo "Running browser compatibility tests..."
npm run test:browsers

echo "✅ All pre-deployment tests passed!"
```

### Smoke Tests

```typescript
// smoke-tests.ts
export class SmokeTests {
  private baseUrl: string;
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }
  
  async runAllTests(): Promise<void> {
    console.log('🧪 Running smoke tests...');
    
    await this.testBasicRendering();
    await this.testErrorHandling();
    await this.testPerformance();
    await this.testFallbacks();
    
    console.log('✅ All smoke tests passed!');
  }
  
  private async testBasicRendering(): Promise<void> {
    console.log('Testing basic PDF rendering...');
    
    const testUrl = `${this.baseUrl}/test-documents/small-test.pdf`;
    const renderer = new ReliablePDFRenderer();
    
    const result = await renderer.renderPDF(testUrl, {
      timeout: 10000,
      diagnosticsEnabled: true,
    });
    
    if (!result.success) {
      throw new Error(`Basic rendering failed: ${result.error?.message}`);
    }
    
    if (result.pages.length === 0) {
      throw new Error('No pages rendered');
    }
    
    console.log(`✅ Rendered ${result.pages.length} pages successfully`);
  }
  
  private async testErrorHandling(): Promise<void> {
    console.log('Testing error handling...');
    
    const invalidUrl = `${this.baseUrl}/non-existent.pdf`;
    const renderer = new ReliablePDFRenderer();
    
    const result = await renderer.renderPDF(invalidUrl, {
      timeout: 5000,
      diagnosticsEnabled: true,
    });
    
    if (result.success) {
      throw new Error('Expected error for invalid URL');
    }
    
    if (!result.error) {
      throw new Error('No error information provided');
    }
    
    console.log(`✅ Error handling working: ${result.error.type}`);
  }
  
  private async testPerformance(): Promise<void> {
    console.log('Testing performance...');
    
    const testUrl = `${this.baseUrl}/test-documents/medium-test.pdf`;
    const renderer = new ReliablePDFRenderer();
    
    const startTime = performance.now();
    const result = await renderer.renderPDF(testUrl, {
      timeout: 15000,
      diagnosticsEnabled: true,
    });
    const endTime = performance.now();
    
    if (!result.success) {
      throw new Error(`Performance test failed: ${result.error?.message}`);
    }
    
    const renderTime = endTime - startTime;
    if (renderTime > 10000) { // 10 seconds
      throw new Error(`Rendering too slow: ${renderTime}ms`);
    }
    
    console.log(`✅ Performance test passed: ${renderTime.toFixed(2)}ms`);
  }
  
  private async testFallbacks(): Promise<void> {
    console.log('Testing fallback mechanisms...');
    
    // Test with PDF.js disabled to force fallback
    const config = createReliabilityConfig({
      features: {
        enablePDFJSCanvas: false,
        enableNativeBrowser: true,
      },
    });
    
    const renderer = new ReliablePDFRenderer(config);
    const testUrl = `${this.baseUrl}/test-documents/small-test.pdf`;
    
    const result = await renderer.renderPDF(testUrl, {
      timeout: 10000,
      diagnosticsEnabled: true,
    });
    
    if (!result.success) {
      throw new Error(`Fallback test failed: ${result.error?.message}`);
    }
    
    if (result.method === RenderingMethod.PDFJS_CANVAS) {
      throw new Error('Expected fallback method, got PDF.js');
    }
    
    console.log(`✅ Fallback test passed: ${result.method}`);
  }
}
```

### Load Testing

```bash
#!/bin/bash
# load-test.sh

ENVIRONMENT=${1:-staging}
CONCURRENT_USERS=${2:-50}
DURATION=${3:-300}

echo "🔥 Running load test against $ENVIRONMENT"
echo "👥 Concurrent users: $CONCURRENT_USERS"
echo "⏱️  Duration: ${DURATION}s"

# Run load test with k6
k6 run --vus $CONCURRENT_USERS --duration ${DURATION}s - <<EOF
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  thresholds: {
    http_req_duration: ['p(95)<10000'], // 95% of requests under 10s
    http_req_failed: ['rate<0.05'],     // Error rate under 5%
  },
};

export default function() {
  let response = http.get('https://$ENVIRONMENT.example.com/test-pdf');
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 10s': (r) => r.timings.duration < 10000,
  });
  
  sleep(1);
}
EOF

echo "✅ Load test completed"
```

## Rollback Procedures

### Automated Rollback

```bash
#!/bin/bash
# rollback.sh

set -e

ENVIRONMENT=${1:-production}
REASON=${2:-"Manual rollback"}

echo "🔄 Starting rollback for $ENVIRONMENT"
echo "📝 Reason: $REASON"

# Get current and previous versions
CURRENT_VERSION=$(kubectl get deployment pdf-app -o jsonpath='{.spec.template.spec.containers[0].image}' | cut -d':' -f2)
PREVIOUS_VERSION=$(kubectl rollout history deployment/pdf-app --revision=1 | grep -o 'pdf-app:[a-f0-9]*' | cut -d':' -f2)

echo "📦 Current version: $CURRENT_VERSION"
echo "📦 Rolling back to: $PREVIOUS_VERSION"

# Perform rollback
echo "🔄 Performing rollback..."
kubectl rollout undo deployment/pdf-app

# Wait for rollback to complete
echo "⏳ Waiting for rollback to complete..."
kubectl rollout status deployment/pdf-app --timeout=300s

# Verify rollback
echo "✅ Verifying rollback..."
./scripts/health-check.sh $ENVIRONMENT

# Update monitoring
echo "📊 Updating monitoring..."
curl -X POST "https://monitoring.example.com/api/events" \
  -H "Content-Type: application/json" \
  -d "{
    \"title\": \"PDF Reliability Rollback\",
    \"text\": \"Rolled back from $CURRENT_VERSION to $PREVIOUS_VERSION. Reason: $REASON\",
    \"tags\": [\"rollback\", \"pdf-reliability\", \"$ENVIRONMENT\"]
  }"

# Notify team
echo "📢 Notifying team..."
./scripts/notify-rollback.sh "$ENVIRONMENT" "$CURRENT_VERSION" "$PREVIOUS_VERSION" "$REASON"

echo "🎉 Rollback completed successfully!"
```

### Manual Rollback Checklist

When automated rollback is not possible:

1. **Immediate Actions**
   - [ ] Stop deployment process
   - [ ] Assess impact and scope
   - [ ] Notify incident response team
   - [ ] Document the issue

2. **Rollback Steps**
   - [ ] Identify last known good version
   - [ ] Prepare rollback deployment
   - [ ] Execute rollback
   - [ ] Verify system functionality
   - [ ] Monitor for stability

3. **Post-Rollback**
   - [ ] Update status page
   - [ ] Notify stakeholders
   - [ ] Conduct post-incident review
   - [ ] Plan fix for next deployment

### Rollback Decision Matrix

| Condition | Automatic Rollback | Manual Review | Continue |
|-----------|-------------------|---------------|----------|
| Error rate > 5% | ✅ | | |
| Performance degradation > 50% | ✅ | | |
| Critical functionality broken | ✅ | | |
| Error rate 1-5% | | ✅ | |
| Performance degradation 20-50% | | ✅ | |
| Non-critical issues | | | ✅ |
| User complaints increasing | | ✅ | |

## Post-Deployment Tasks

### Immediate Tasks (Day 1)

1. **Monitor Key Metrics**
   ```bash
   # Check error rates
   kubectl logs -l app=pdf-app --tail=1000 | grep ERROR
   
   # Check performance metrics
   curl -s "https://monitoring.example.com/api/metrics/pdf_render_time_p95"
   
   # Check resource usage
   kubectl top pods -l app=pdf-app
   ```

2. **Validate Core Functionality**
   ```bash
   # Run smoke tests
   ./scripts/smoke-tests.sh production
   
   # Test different document types
   ./scripts/test-document-types.sh
   
   # Verify fallback mechanisms
   ./scripts/test-fallbacks.sh
   ```

3. **Update Documentation**
   - [ ] Update deployment notes
   - [ ] Record configuration changes
   - [ ] Update runbooks
   - [ ] Notify support team

### Short-term Tasks (Week 1)

1. **Performance Analysis**
   - Analyze performance metrics
   - Compare with baseline
   - Identify optimization opportunities
   - Document performance improvements

2. **User Feedback Collection**
   - Monitor support tickets
   - Collect user feedback
   - Analyze usage patterns
   - Identify pain points

3. **System Optimization**
   - Fine-tune configuration
   - Optimize resource allocation
   - Update monitoring thresholds
   - Plan future improvements

### Long-term Tasks (Month 1)

1. **Comprehensive Review**
   - Conduct post-deployment review
   - Analyze success metrics
   - Document lessons learned
   - Plan next iteration

2. **Capacity Planning**
   - Analyze usage growth
   - Plan infrastructure scaling
   - Update capacity models
   - Prepare for peak loads

3. **Feature Enhancement**
   - Prioritize new features
   - Plan performance improvements
   - Schedule maintenance windows
   - Update roadmap

## Troubleshooting

### Common Deployment Issues

#### Configuration Problems

**Symptoms**: Application fails to start or behaves unexpectedly
**Diagnosis**:
```bash
# Check environment variables
kubectl exec -it pod/pdf-app-xxx -- env | grep PDF

# Validate configuration
kubectl exec -it pod/pdf-app-xxx -- node -e "
  require('./dist/lib/pdf-reliability/config').validateReliabilityConfig();
  console.log('Configuration valid');
"
```

**Solutions**:
1. Verify all required environment variables are set
2. Check configuration syntax and values
3. Validate feature flag combinations
4. Review environment-specific overrides

#### Network Connectivity Issues

**Symptoms**: PDF loading failures, timeout errors
**Diagnosis**:
```bash
# Test network connectivity
kubectl exec -it pod/pdf-app-xxx -- curl -I https://example.com/test.pdf

# Check DNS resolution
kubectl exec -it pod/pdf-app-xxx -- nslookup example.com

# Verify CORS configuration
curl -H "Origin: https://app.example.com" -I https://cdn.example.com/test.pdf
```

**Solutions**:
1. Verify network policies allow outbound connections
2. Check firewall rules
3. Validate CORS configuration
4. Test with different CDN endpoints

#### Performance Issues

**Symptoms**: Slow rendering, high memory usage, timeouts
**Diagnosis**:
```bash
# Check resource usage
kubectl top pods -l app=pdf-app

# Analyze performance metrics
kubectl logs -l app=pdf-app | grep "Performance:"

# Check for memory leaks
kubectl exec -it pod/pdf-app-xxx -- node -e "
  console.log('Memory usage:', process.memoryUsage());
"
```

**Solutions**:
1. Adjust memory limits and requests
2. Optimize configuration for environment
3. Enable aggressive memory management
4. Scale horizontally if needed

### Emergency Procedures

#### Critical System Failure

1. **Immediate Response**
   ```bash
   # Execute emergency rollback
   ./scripts/emergency-rollback.sh production "Critical system failure"
   
   # Scale up previous version
   kubectl scale deployment pdf-app-stable --replicas=10
   
   # Redirect all traffic to stable version
   kubectl patch service pdf-app-service -p '{"spec":{"selector":{"version":"stable"}}}'
   ```

2. **Communication**
   ```bash
   # Update status page
   curl -X POST "https://status.example.com/api/incidents" \
     -d "title=PDF Rendering Service Issues&status=investigating"
   
   # Notify team
   ./scripts/notify-incident.sh "Critical PDF rendering failure"
   ```

3. **Investigation**
   - Collect logs and metrics
   - Identify root cause
   - Prepare hotfix
   - Plan recovery strategy

#### Partial Service Degradation

1. **Assessment**
   ```bash
   # Check service health
   ./scripts/health-check.sh production --detailed
   
   # Analyze error patterns
   kubectl logs -l app=pdf-app --since=1h | grep ERROR | sort | uniq -c
   ```

2. **Mitigation**
   ```bash
   # Enable aggressive fallbacks
   kubectl set env deployment/pdf-app ENABLE_ALL_FALLBACKS=true
   
   # Increase timeout values
   kubectl set env deployment/pdf-app DEFAULT_TIMEOUT=60000
   ```

3. **Monitoring**
   - Watch error rates closely
   - Monitor user impact
   - Prepare for full rollback if needed

This comprehensive deployment guide ensures a smooth, reliable rollout of the PDF Rendering Reliability Fix while maintaining system stability and user experience.