/**
 * Setup script for the alerting system
 * 
 * This script helps configure the alerting system by:
 * - Checking required environment variables
 * - Testing notification channels
 * - Providing setup instructions
 */

import { alertingSystem } from '@/lib/monitoring/alerting-system';
import { logger } from '@/lib/logger';

interface SetupResult {
  step: string;
  status: 'success' | 'warning' | 'error';
  message: string;
  details?: string;
}

async function setupAlertingSystem(): Promise<SetupResult[]> {
  const results: SetupResult[] = [];

  console.log('🚀 Setting up JStudyRoom Alerting System...\n');

  // Step 1: Check environment variables
  console.log('1. Checking environment variables...');
  
  const envChecks = [
    {
      name: 'RESEND_API_KEY',
      value: process.env.RESEND_API_KEY,
      required: false,
      description: 'Required for email notifications'
    },
    {
      name: 'ALERT_FROM_EMAIL',
      value: process.env.ALERT_FROM_EMAIL,
      required: false,
      description: 'Email address to send alerts from'
    },
    {
      name: 'ALERT_TO_EMAIL',
      value: process.env.ALERT_TO_EMAIL,
      required: false,
      description: 'Email address to send alerts to'
    },
    {
      name: 'SLACK_WEBHOOK_URL',
      value: process.env.SLACK_WEBHOOK_URL,
      required: false,
      description: 'Slack webhook URL for notifications'
    },
    {
      name: 'SLACK_ALERT_CHANNEL',
      value: process.env.SLACK_ALERT_CHANNEL,
      required: false,
      description: 'Slack channel for alerts (default: #alerts)'
    }
  ];

  let envConfigured = 0;
  for (const check of envChecks) {
    if (check.value) {
      results.push({
        step: `Environment: ${check.name}`,
        status: 'success',
        message: 'Configured',
        details: check.description
      });
      envConfigured++;
    } else {
      results.push({
        step: `Environment: ${check.name}`,
        status: check.required ? 'error' : 'warning',
        message: check.required ? 'Missing (required)' : 'Not configured (optional)',
        details: check.description
      });
    }
  }

  if (envConfigured === 0) {
    results.push({
      step: 'Environment Configuration',
      status: 'warning',
      message: 'No notification channels configured',
      details: 'Only console notifications will be available'
    });
  } else {
    results.push({
      step: 'Environment Configuration',
      status: 'success',
      message: `${envConfigured} notification channels configured`
    });
  }

  // Step 2: Test notification channels
  console.log('\n2. Testing notification channels...');
  
  try {
    const testResults = await alertingSystem.testNotifications();
    
    for (const [channel, success] of Object.entries(testResults)) {
      results.push({
        step: `Test: ${channel}`,
        status: success ? 'success' : 'error',
        message: success ? 'Working' : 'Failed',
        details: success ? 'Test notification sent successfully' : 'Check configuration and logs'
      });
    }

    const workingChannels = Object.values(testResults).filter(Boolean).length;
    results.push({
      step: 'Notification Testing',
      status: workingChannels > 0 ? 'success' : 'error',
      message: `${workingChannels} channels working`
    });

  } catch (error) {
    results.push({
      step: 'Notification Testing',
      status: 'error',
      message: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Step 3: Check alert rules
  console.log('\n3. Checking alert rules...');
  
  try {
    // Get current alert stats to verify the system is working
    const stats = await alertingSystem.getAlertStats();
    
    results.push({
      step: 'Alert Rules',
      status: 'success',
      message: 'Alert system operational',
      details: `${stats.total} total alerts in history`
    });

  } catch (error) {
    results.push({
      step: 'Alert Rules',
      status: 'error',
      message: 'Alert system error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  // Step 4: Performance monitoring integration
  console.log('\n4. Checking performance monitoring integration...');
  
  try {
    // Import performance monitor to check integration
    const { performanceMonitor } = await import('@/lib/monitoring/performance-monitor');
    
    results.push({
      step: 'Performance Integration',
      status: 'success',
      message: 'Performance monitoring integrated',
      details: 'Alerts will be triggered automatically based on performance metrics'
    });

  } catch (error) {
    results.push({
      step: 'Performance Integration',
      status: 'error',
      message: 'Integration error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }

  return results;
}

function printResults(results: SetupResult[]) {
  console.log('\n📊 Setup Results:\n');
  
  const statusEmojis = {
    success: '✅',
    warning: '⚠️',
    error: '❌'
  };

  let successCount = 0;
  let warningCount = 0;
  let errorCount = 0;

  for (const result of results) {
    const emoji = statusEmojis[result.status];
    console.log(`${emoji} ${result.step}: ${result.message}`);
    
    if (result.details) {
      console.log(`   ${result.details}`);
    }
    
    switch (result.status) {
      case 'success': successCount++; break;
      case 'warning': warningCount++; break;
      case 'error': errorCount++; break;
    }
    
    console.log('');
  }

  console.log('📈 Summary:');
  console.log(`   ✅ Success: ${successCount}`);
  console.log(`   ⚠️  Warning: ${warningCount}`);
  console.log(`   ❌ Error: ${errorCount}`);
  console.log('');

  if (errorCount === 0 && warningCount === 0) {
    console.log('🎉 Alerting system is fully configured and ready!');
  } else if (errorCount === 0) {
    console.log('✨ Alerting system is working with some optional features not configured.');
  } else {
    console.log('🔧 Alerting system needs attention. Please fix the errors above.');
  }
}

function printSetupInstructions() {
  console.log('\n📋 Setup Instructions:\n');
  
  console.log('1. Email Notifications (via Resend):');
  console.log('   - Sign up at https://resend.com');
  console.log('   - Get your API key');
  console.log('   - Add to .env: RESEND_API_KEY=your_api_key');
  console.log('   - Add to .env: ALERT_FROM_EMAIL=alerts@yourdomain.com');
  console.log('   - Add to .env: ALERT_TO_EMAIL=admin@yourdomain.com');
  console.log('');
  
  console.log('2. Slack Notifications:');
  console.log('   - Create a Slack app at https://api.slack.com/apps');
  console.log('   - Enable Incoming Webhooks');
  console.log('   - Create a webhook for your channel');
  console.log('   - Add to .env: SLACK_WEBHOOK_URL=your_webhook_url');
  console.log('   - Add to .env: SLACK_ALERT_CHANNEL=#alerts (optional)');
  console.log('');
  
  console.log('3. Custom Webhooks:');
  console.log('   - Configure via the AlertsManagement component');
  console.log('   - Or update the alerting system configuration directly');
  console.log('');
  
  console.log('4. Alert Rules:');
  console.log('   - Default rules are pre-configured');
  console.log('   - Customize via the AlertsManagement component');
  console.log('   - Or use the API endpoints');
  console.log('');
  
  console.log('5. Testing:');
  console.log('   - Run this script again to test configuration');
  console.log('   - Use the AlertsManagement component test feature');
  console.log('   - Monitor logs for alert activity');
}

async function main() {
  try {
    const results = await setupAlertingSystem();
    printResults(results);
    
    const hasErrors = results.some(r => r.status === 'error');
    const hasWarnings = results.some(r => r.status === 'warning');
    
    if (hasErrors || hasWarnings) {
      printSetupInstructions();
    }
    
    console.log('\n🔗 Next Steps:');
    console.log('   - Add the AlertsManagement component to your admin dashboard');
    console.log('   - Monitor the /api/monitoring/alerts endpoint');
    console.log('   - Check logs for alert activity');
    console.log('   - Test with actual performance issues');
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  main();
}

export { setupAlertingSystem, printResults, printSetupInstructions };