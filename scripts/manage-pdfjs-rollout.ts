/**
 * PDF.js Rollout Management Script
 * 
 * Helper script to manage PDF.js viewer rollout phases
 * Provides commands to check status, advance phases, and rollback
 * 
 * Usage:
 *   npm run rollout:status    - Check current rollout status
 *   npm run rollout:advance   - Advance to next phase
 *   npm run rollout:rollback  - Rollback to previous phase
 *   npm run rollout:disable   - Disable PDF.js completely
 * 
 * Requirements: All (Task 16.2)
 */

import { getAllFeatureFlags, FeatureFlagKey } from '../lib/feature-flags';

interface RolloutPhase {
  name: string;
  percentage: number | undefined;
  testEmails: string[];
  description: string;
}

const ROLLOUT_PHASES: RolloutPhase[] = [
  {
    name: 'Phase 0: Disabled',
    percentage: undefined,
    testEmails: [],
    description: 'PDF.js is completely disabled',
  },
  {
    name: 'Phase 1: Test Users',
    percentage: undefined,
    testEmails: ['admin@jstudyroom.dev', 'sivaramj83@gmail.com'],
    description: 'PDF.js enabled for test users only',
  },
  {
    name: 'Phase 2: 10% Rollout',
    percentage: 10,
    testEmails: ['admin@jstudyroom.dev'],
    description: 'PDF.js enabled for 10% of users + test users',
  },
  {
    name: 'Phase 3: 50% Rollout',
    percentage: 50,
    testEmails: [],
    description: 'PDF.js enabled for 50% of users',
  },
  {
    name: 'Phase 4: 100% Rollout',
    percentage: 100,
    testEmails: [],
    description: 'PDF.js enabled for all users',
  },
];

function getCurrentPhase(): number {
  const flags = getAllFeatureFlags();
  const pdfjsFlag = flags[FeatureFlagKey.PDFJS_VIEWER];
  
  if (!pdfjsFlag.enabled) {
    return 0; // Disabled
  }
  
  const percentage = pdfjsFlag.rolloutPercentage;
  const hasTestEmails = (pdfjsFlag.allowedEmails?.length || 0) > 0;
  
  // Phase 1: Test users only (no percentage, has test emails)
  if (percentage === undefined && hasTestEmails) {
    return 1;
  }
  
  // Phase 2: 10% rollout
  if (percentage === 10) {
    return 2;
  }
  
  // Phase 3: 50% rollout
  if (percentage === 50) {
    return 3;
  }
  
  // Phase 4: 100% rollout
  if (percentage === 100 || percentage === undefined) {
    return 4;
  }
  
  // Unknown phase
  return -1;
}

function displayStatus() {
  const currentPhaseIndex = getCurrentPhase();
  const flags = getAllFeatureFlags();
  const pdfjsFlag = flags[FeatureFlagKey.PDFJS_VIEWER];
  
  console.log('\n=== PDF.js Rollout Status ===\n');
  
  if (currentPhaseIndex === -1) {
    console.log('⚠️  Unknown phase configuration');
    console.log('\nCurrent Configuration:');
    console.log(`  Enabled: ${pdfjsFlag.enabled}`);
    console.log(`  Rollout Percentage: ${pdfjsFlag.rolloutPercentage || 'undefined'}`);
    console.log(`  Test Emails: ${pdfjsFlag.allowedEmails?.join(', ') || 'none'}`);
    return;
  }
  
  const currentPhase = ROLLOUT_PHASES[currentPhaseIndex];
  
  console.log(`Current Phase: ${currentPhase.name}`);
  console.log(`Description: ${currentPhase.description}`);
  console.log('\nConfiguration:');
  console.log(`  NEXT_PUBLIC_ENABLE_PDFJS: ${pdfjsFlag.enabled}`);
  console.log(`  NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE: ${pdfjsFlag.rolloutPercentage || '(empty)'}`);
  console.log(`  NEXT_PUBLIC_PDFJS_TEST_EMAILS: ${pdfjsFlag.allowedEmails?.join(', ') || '(empty)'}`);
  
  console.log('\n=== Rollout Progress ===\n');
  
  ROLLOUT_PHASES.forEach((phase, index) => {
    const isCurrent = index === currentPhaseIndex;
    const isPast = index < currentPhaseIndex;
    const isFuture = index > currentPhaseIndex;
    
    let status = '';
    if (isCurrent) status = '→ CURRENT';
    else if (isPast) status = '✓ COMPLETED';
    else if (isFuture) status = '⏳ PENDING';
    
    console.log(`${status.padEnd(15)} ${phase.name}`);
  });
  
  console.log('\n=== Next Steps ===\n');
  
  if (currentPhaseIndex === 0) {
    console.log('To start rollout, run: npm run rollout:advance');
    console.log('This will enable PDF.js for test users only.');
  } else if (currentPhaseIndex < ROLLOUT_PHASES.length - 1) {
    const nextPhase = ROLLOUT_PHASES[currentPhaseIndex + 1];
    console.log(`To advance to ${nextPhase.name}, run: npm run rollout:advance`);
    console.log(`This will: ${nextPhase.description}`);
    console.log('\n⚠️  Before advancing, ensure:');
    console.log('  - All success criteria for current phase are met');
    console.log('  - Error rate is acceptable');
    console.log('  - No critical issues reported');
    console.log('  - Monitoring data looks good');
  } else {
    console.log('✅ Rollout complete! All users have PDF.js enabled.');
    console.log('\nNext: Monitor for 14 days, then proceed to Task 16.3 (Remove iframe fallback)');
  }
  
  console.log('\n=== Commands ===\n');
  console.log('  npm run rollout:status    - Show this status');
  console.log('  npm run rollout:advance   - Advance to next phase');
  console.log('  npm run rollout:rollback  - Rollback to previous phase');
  console.log('  npm run rollout:disable   - Disable PDF.js completely');
  console.log('');
}

function displayAdvanceInstructions() {
  const currentPhaseIndex = getCurrentPhase();
  
  if (currentPhaseIndex === -1) {
    console.log('⚠️  Unknown phase configuration. Please check your environment variables.');
    return;
  }
  
  if (currentPhaseIndex >= ROLLOUT_PHASES.length - 1) {
    console.log('✅ Already at final phase (100% rollout)');
    return;
  }
  
  const nextPhase = ROLLOUT_PHASES[currentPhaseIndex + 1];
  
  console.log('\n=== Advance to Next Phase ===\n');
  console.log(`Next Phase: ${nextPhase.name}`);
  console.log(`Description: ${nextPhase.description}`);
  console.log('\nUpdate your .env file with:');
  console.log('');
  console.log('NEXT_PUBLIC_ENABLE_PDFJS="true"');
  
  if (nextPhase.percentage !== undefined) {
    console.log(`NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="${nextPhase.percentage}"`);
  } else {
    console.log('NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE=""');
  }
  
  if (nextPhase.testEmails.length > 0) {
    console.log(`NEXT_PUBLIC_PDFJS_TEST_EMAILS="${nextPhase.testEmails.join(',')}"`);
  } else {
    console.log('NEXT_PUBLIC_PDFJS_TEST_EMAILS=""');
  }
  
  console.log('');
  console.log('Then deploy:');
  console.log('  npm run build');
  console.log('  vercel --prod');
  console.log('');
  console.log('⚠️  Before advancing, ensure all success criteria are met!');
  console.log('');
}

function displayRollbackInstructions() {
  const currentPhaseIndex = getCurrentPhase();
  
  if (currentPhaseIndex === -1) {
    console.log('⚠️  Unknown phase configuration. Please check your environment variables.');
    return;
  }
  
  if (currentPhaseIndex === 0) {
    console.log('Already at Phase 0 (Disabled). Cannot rollback further.');
    return;
  }
  
  const previousPhase = ROLLOUT_PHASES[currentPhaseIndex - 1];
  
  console.log('\n=== Rollback to Previous Phase ===\n');
  console.log(`Previous Phase: ${previousPhase.name}`);
  console.log(`Description: ${previousPhase.description}`);
  console.log('\nUpdate your .env file with:');
  console.log('');
  
  if (previousPhase.name === 'Phase 0: Disabled') {
    console.log('NEXT_PUBLIC_ENABLE_PDFJS="false"');
  } else {
    console.log('NEXT_PUBLIC_ENABLE_PDFJS="true"');
    
    if (previousPhase.percentage !== undefined) {
      console.log(`NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE="${previousPhase.percentage}"`);
    } else {
      console.log('NEXT_PUBLIC_PDFJS_ROLLOUT_PERCENTAGE=""');
    }
    
    if (previousPhase.testEmails.length > 0) {
      console.log(`NEXT_PUBLIC_PDFJS_TEST_EMAILS="${previousPhase.testEmails.join(',')}"`);
    } else {
      console.log('NEXT_PUBLIC_PDFJS_TEST_EMAILS=""');
    }
  }
  
  console.log('');
  console.log('Then deploy:');
  console.log('  npm run build');
  console.log('  vercel --prod');
  console.log('');
}

function displayDisableInstructions() {
  console.log('\n=== Disable PDF.js Completely ===\n');
  console.log('Update your .env file with:');
  console.log('');
  console.log('NEXT_PUBLIC_ENABLE_PDFJS="false"');
  console.log('');
  console.log('Then deploy:');
  console.log('  npm run build');
  console.log('  vercel --prod');
  console.log('');
  console.log('This will disable PDF.js for all users and revert to iframe rendering.');
  console.log('');
}

// Main execution
const command = process.argv[2];

switch (command) {
  case 'status':
    displayStatus();
    break;
  
  case 'advance':
    displayAdvanceInstructions();
    break;
  
  case 'rollback':
    displayRollbackInstructions();
    break;
  
  case 'disable':
    displayDisableInstructions();
    break;
  
  default:
    console.log('\nPDF.js Rollout Management\n');
    console.log('Usage:');
    console.log('  npm run rollout:status    - Check current rollout status');
    console.log('  npm run rollout:advance   - Get instructions to advance to next phase');
    console.log('  npm run rollout:rollback  - Get instructions to rollback to previous phase');
    console.log('  npm run rollout:disable   - Get instructions to disable PDF.js');
    console.log('');
    break;
}
