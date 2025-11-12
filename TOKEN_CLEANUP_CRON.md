# Token Cleanup Cron Job

This document explains the automated token cleanup system for expired verification and password reset tokens.

## Overview

The token cleanup cron job automatically deletes expired verification tokens that are older than 7 days from the database. This helps maintain database performance and removes stale data.

## How It Works

1. **Scheduled Execution**: The cron job runs daily at 2:00 AM UTC
2. **Cleanup Logic**: Deletes tokens with `expiresAt` date older than 7 days
3. **Logging**: Logs the number of tokens deleted and any errors
4. **Security**: Protected by a secret token to prevent unauthorized access

## Configuration

### Vercel Deployment

The cron job is configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-tokens",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Schedule Format**: Uses standard cron syntax
- `0 2 * * *` = Every day at 2:00 AM UTC
- Modify the schedule as needed (e.g., `0 */6 * * *` for every 6 hours)

### Environment Variables

Add the following to your environment variables:

```env
CRON_SECRET="your-secure-random-string-here"
```

**Generate a secure secret**:
```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### Vercel Setup

1. Add `CRON_SECRET` to your Vercel project environment variables:
   - Go to Project Settings → Environment Variables
   - Add `CRON_SECRET` with your generated secret
   - Apply to Production, Preview, and Development environments

2. Deploy your application with the `vercel.json` configuration

3. Vercel will automatically set up the cron job

## Manual Execution

You can manually trigger the cleanup job for testing:

### Using curl

```bash
curl -X POST https://your-domain.com/api/cron/cleanup-tokens \
  -H "Authorization: Bearer your-cron-secret"
```

### Using the API

```typescript
const response = await fetch('/api/cron/cleanup-tokens', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.CRON_SECRET}`,
  },
});

const result = await response.json();
console.log(result);
// { success: true, deletedCount: 42, timestamp: "2024-01-15T02:00:00.000Z" }
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Token cleanup completed",
  "deletedCount": 42,
  "timestamp": "2024-01-15T02:00:00.000Z"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Token cleanup failed",
  "message": "Database connection error"
}
```

## Monitoring

### Logs

The cleanup job logs the following events:

1. **Job Start**: When the cleanup begins
2. **Job Completion**: Number of tokens deleted
3. **Errors**: Any failures during cleanup
4. **Unauthorized Access**: Failed authentication attempts

### Viewing Logs

**Vercel**:
- Go to your project dashboard
- Navigate to Logs
- Filter by `/api/cron/cleanup-tokens`

**Example log entries**:
```
[INFO] Starting token cleanup job
[INFO] Token cleanup job completed { deletedCount: 42, timestamp: "2024-01-15T02:00:00.000Z" }
```

## Alternative Deployment Options

### Self-Hosted with Node-Cron

If not using Vercel, you can use `node-cron`:

```typescript
// scripts/cron-jobs.ts
import cron from 'node-cron';
import { cleanupExpiredTokens } from '@/lib/tokens';
import { logger } from '@/lib/logger';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  try {
    logger.info('Starting token cleanup job');
    const deletedCount = await cleanupExpiredTokens();
    logger.info('Token cleanup completed', { deletedCount });
  } catch (error) {
    logger.error('Token cleanup failed', { error });
  }
});
```

### System Cron (Linux/Unix)

Add to your crontab:

```bash
# Edit crontab
crontab -e

# Add this line (runs daily at 2 AM)
0 2 * * * curl -X POST https://your-domain.com/api/cron/cleanup-tokens -H "Authorization: Bearer your-cron-secret"
```

### GitHub Actions

Create `.github/workflows/cleanup-tokens.yml`:

```yaml
name: Cleanup Expired Tokens

on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger cleanup
        run: |
          curl -X POST ${{ secrets.APP_URL }}/api/cron/cleanup-tokens \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}"
```

## Security Considerations

1. **Secret Protection**: Never commit `CRON_SECRET` to version control
2. **Authorization**: Always verify the secret before running cleanup
3. **Rate Limiting**: Consider adding rate limiting to prevent abuse
4. **Monitoring**: Set up alerts for failed cleanup jobs
5. **Access Logs**: Monitor for unauthorized access attempts

## Troubleshooting

### Cron Job Not Running

1. **Verify Vercel Configuration**:
   - Check `vercel.json` is in the project root
   - Ensure the cron path matches your API route
   - Verify the schedule syntax is correct

2. **Check Environment Variables**:
   - Ensure `CRON_SECRET` is set in Vercel
   - Verify database connection variables are correct

3. **Review Logs**:
   - Check Vercel logs for execution attempts
   - Look for error messages or stack traces

### Unauthorized Errors

- Verify `CRON_SECRET` matches in both Vercel and your requests
- Check the Authorization header format: `Bearer your-secret`

### Database Errors

- Ensure database connection is working
- Verify Prisma schema includes `VerificationToken` model
- Check database permissions

## Testing

### Local Testing

```bash
# Set environment variable
export CRON_SECRET="test-secret-123"

# Start your development server
npm run dev

# In another terminal, trigger the cleanup
curl -X POST http://localhost:3000/api/cron/cleanup-tokens \
  -H "Authorization: Bearer test-secret-123"
```

### Verify Cleanup Logic

```typescript
// Create test tokens
import { prisma } from '@/lib/db';

// Create an expired token (older than 7 days)
await prisma.verificationToken.create({
  data: {
    userId: 'test-user-id',
    token: 'test-token-hash',
    type: 'EMAIL_VERIFICATION',
    expiresAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000), // 8 days ago
  },
});

// Run cleanup
const deletedCount = await cleanupExpiredTokens();
console.log(`Deleted ${deletedCount} tokens`);
```

## Maintenance

### Adjusting Cleanup Frequency

Modify the schedule in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-tokens",
      "schedule": "0 */6 * * *"  // Every 6 hours
    }
  ]
}
```

### Changing Retention Period

Modify the cleanup logic in `lib/tokens.ts`:

```typescript
// Change from 7 days to 30 days
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
```

## Best Practices

1. **Regular Monitoring**: Check logs weekly to ensure cleanup is running
2. **Alert Setup**: Configure alerts for failed cleanup jobs
3. **Backup Strategy**: Ensure database backups before major changes
4. **Performance**: Monitor database performance after cleanup
5. **Documentation**: Keep this document updated with any changes

## Related Documentation

- [Email Verification Design](./kiro/specs/email-verification-password-reset/design.md)
- [Token Management](./lib/tokens.ts)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
