# Library Utilities

This directory contains core utility functions and configurations for the FlipBook DRM application.

## Files Overview

### `auth.ts`
NextAuth configuration and authentication utilities.
- Credentials provider with email/password
- JWT session strategy
- Password hashing and verification
- Secure cookie configuration for production

### `db.ts`
Prisma client singleton for database connections.
- Connection pooling
- Prevents multiple instances in development

### `storage.ts`
Supabase Storage utilities for file management.
- File upload with validation
- File deletion
- Signed URL generation with expiration
- Error handling

### `razorpay.ts`
Payment processing with Razorpay integration.
- Order creation
- Payment signature verification
- Subscription plan definitions
- HMAC-SHA256 signature validation

### `validation.ts`
Input validation utilities.
- File type and size validation
- Email format validation
- Storage quota checking
- Subscription limit enforcement

### `sanitization.ts` ⚠️ Security Critical
Input sanitization to prevent security vulnerabilities.

**Functions:**
- `sanitizeString()` - Removes HTML tags, script injections, event handlers
- `sanitizeEmail()` - Validates and normalizes email addresses
- `sanitizeFilename()` - Prevents path traversal attacks
- `sanitizeInteger()` - Validates numeric inputs
- `sanitizeNumber()` - Validates floating-point numbers
- `sanitizeBoolean()` - Validates boolean inputs
- `sanitizeUrl()` - Validates URLs and restricts protocols
- `sanitizeObject()` - Bulk sanitization for objects
- `checkRateLimit()` - Simple in-memory rate limiting

**Usage Example:**
```typescript
import { sanitizeString, sanitizeEmail } from '@/lib/sanitization';

const name = sanitizeString(userInput.name);
const email = sanitizeEmail(userInput.email);
```

**Security Notes:**
- Always sanitize user inputs before processing
- Use appropriate sanitization function for data type
- Sanitization is defense-in-depth (Prisma prevents SQL injection)
- Rate limiting uses in-memory storage (use Redis for production)

### `logger.ts` 📊 Monitoring
Structured logging and error monitoring.

**Log Levels:**
- `info` - Informational messages
- `warn` - Warning messages
- `error` - Error messages with stack traces
- `debug` - Debug messages (development only)

**Usage Example:**
```typescript
import { logger } from '@/lib/logger';

// Log info
logger.info('User logged in', { userId: user.id });

// Log error
logger.error('Database query failed', error, { 
  userId: user.id,
  query: 'SELECT * FROM users'
});

// Log security event
logger.logSecurityEvent('Failed login attempt', 'medium', {
  email: email,
  ipAddress: ip
});
```

**Features:**
- Structured JSON logging in production
- Colored console output in development
- Automatic error context capture
- Security event tracking
- Request/response logging
- Sensitive data sanitization

**Integration:**
- Ready for Sentry integration (set `SENTRY_DSN`)
- Compatible with log aggregation services
- Supports custom monitoring solutions

### `utils.ts`
General utility functions.
- Class name merging (cn)
- Share key generation
- Date formatting
- Other helper functions

## Security Best Practices

### Input Sanitization
Always sanitize user inputs in API routes:

```typescript
import { sanitizeString, sanitizeEmail } from '@/lib/sanitization';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const name = sanitizeString(body.name);
  const email = sanitizeEmail(body.email);
  // ... rest of handler
}
```

### Error Logging
Use structured logging instead of console.log:

```typescript
import { logger } from '@/lib/logger';

try {
  // ... operation
} catch (error) {
  logger.error('Operation failed', error, {
    userId: session.user.id,
    operation: 'document_upload'
  });
}
```

### Rate Limiting
The current implementation uses in-memory storage. For production with multiple servers:

```typescript
// Consider using Redis
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

export async function checkRateLimit(key: string) {
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.expire(key, 60); // 60 seconds
  }
  return count <= 100; // 100 requests per minute
}
```

## Environment Variables Required

```bash
# Database
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Authentication
NEXTAUTH_URL="https://your-domain.com"
NEXTAUTH_SECRET="your-secret-key"

# Storage
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Payment
RAZORPAY_KEY_ID="rzp_live_xxxxx"
RAZORPAY_KEY_SECRET="your-secret"

# Optional - Monitoring
SENTRY_DSN="https://xxxxx@sentry.io/xxxxx"
IP_GEOLOCATION_API_KEY="your-api-key"
```

## Testing

### Unit Tests
Test sanitization functions:

```typescript
import { sanitizeString, sanitizeEmail } from '@/lib/sanitization';

describe('sanitizeString', () => {
  it('should remove HTML tags', () => {
    expect(sanitizeString('<script>alert("xss")</script>'))
      .toBe('scriptalert("xss")/script');
  });
});
```

### Integration Tests
Test with actual API routes:

```typescript
import { POST } from '@/app/api/documents/route';

describe('POST /api/documents', () => {
  it('should sanitize document title', async () => {
    const response = await POST(mockRequest);
    // ... assertions
  });
});
```

## Performance Considerations

### Rate Limiting
- In-memory storage is fast but not distributed
- Consider Redis for production with multiple servers
- Adjust limits based on your traffic patterns

### Logging
- Structured logging has minimal overhead
- Avoid logging large objects
- Use log levels appropriately (debug only in development)

### Sanitization
- Sanitization functions are lightweight
- Applied per-request, not per-field
- Negligible performance impact

## Maintenance

### Regular Updates
- Review and update sanitization patterns
- Monitor for new security vulnerabilities
- Update dependencies regularly
- Review logs for suspicious patterns

### Monitoring
- Set up alerts for error rates
- Monitor rate limit violations
- Track authentication failures
- Review security events weekly

## Additional Resources

- [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Prisma Security](https://www.prisma.io/docs/concepts/components/prisma-client/security)

---

**Last Updated**: November 2025
