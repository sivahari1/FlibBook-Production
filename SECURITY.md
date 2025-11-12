# Security Policy

## Overview

FlipBook DRM takes security seriously. This document outlines our security measures, policies, and procedures.

## Security Features

### Authentication & Authorization

- **Password Security**: All passwords are hashed using bcrypt with 12 rounds
- **Session Management**: JWT-based sessions with HTTP-only cookies
- **Secure Cookies**: Production cookies use `__Secure-` prefix and secure flag
- **Session Expiration**: 30-day maximum session lifetime
- **Authorization Checks**: All API routes verify user authentication and resource ownership

### Input Validation & Sanitization

All user inputs are validated and sanitized to prevent:
- SQL Injection (via Prisma parameterized queries)
- XSS (Cross-Site Scripting) attacks
- Path Traversal attacks
- Command Injection

Sanitization functions in `lib/sanitization.ts`:
- `sanitizeString()` - Removes HTML tags and dangerous characters
- `sanitizeEmail()` - Validates and normalizes email addresses
- `sanitizeFilename()` - Prevents path traversal in filenames
- `sanitizeInteger()` - Validates numeric inputs
- `sanitizeUrl()` - Validates and restricts URL protocols

### Rate Limiting

Rate limiting is implemented to prevent abuse:
- **Auth endpoints**: 5 requests per minute per IP
- **API endpoints**: 100 requests per minute per IP
- **Configurable**: Adjust limits in `middleware.ts`

For production with multiple servers, consider using Redis for distributed rate limiting.

### Security Headers

The following security headers are automatically applied:

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Frame-Options: SAMEORIGIN
X-Content-Type-Options: nosniff
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Content-Security-Policy: [Configured for Razorpay and Supabase]
```

### File Upload Security

- **Type Validation**: Only PDF files (application/pdf) are accepted
- **Size Limits**: Maximum 50MB per file
- **Filename Sanitization**: Special characters removed, path traversal prevented
- **Storage Isolation**: Files stored in user-specific folders
- **Private Storage**: Supabase bucket is private with RLS policies
- **Signed URLs**: Temporary access URLs with 1-hour expiration

### DRM Protection

Client-side protection measures:
- Right-click context menu disabled
- Text selection disabled
- Copy/paste keyboard shortcuts blocked
- Print keyboard shortcuts blocked
- DevTools detection with warnings
- Dynamic watermarking with viewer identification

### Payment Security

- **Razorpay Integration**: PCI-compliant payment processing
- **Signature Verification**: All payments verified with HMAC-SHA256
- **Server-side Validation**: Amount and order verification before processing
- **No Sensitive Data**: Payment details never stored in our database

### Data Protection

- **Encryption in Transit**: HTTPS enforced for all connections
- **Encryption at Rest**: Database and storage encrypted by Supabase
- **Access Control**: Row-level security policies on database
- **Signed URLs**: Temporary, expiring URLs for file access
- **Password Protection**: Optional password protection for share links

## Reporting Security Vulnerabilities

If you discover a security vulnerability, please report it responsibly:

1. **DO NOT** open a public GitHub issue
2. Email security details to: [security@your-domain.com]
3. Include:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

We will:
- Acknowledge receipt within 48 hours
- Provide an initial assessment within 7 days
- Keep you informed of our progress
- Credit you in our security acknowledgments (if desired)

## Security Best Practices for Deployment

### Environment Variables

- ✅ Never commit `.env` files to version control
- ✅ Use different credentials for dev/staging/production
- ✅ Rotate secrets every 90 days
- ✅ Use strong, randomly generated secrets
- ✅ Limit access to production environment variables

### Database Security

- ✅ Use connection pooling (pgbouncer)
- ✅ Enable SSL for database connections
- ✅ Implement row-level security policies
- ✅ Regular backups with encryption
- ✅ Monitor for suspicious queries

### API Security

- ✅ Validate all inputs
- ✅ Sanitize all outputs
- ✅ Use parameterized queries (Prisma)
- ✅ Implement rate limiting
- ✅ Log security events
- ✅ Monitor for unusual patterns

### Storage Security

- ✅ Use private buckets
- ✅ Implement RLS policies
- ✅ Use signed URLs with short expiration
- ✅ Validate file types and sizes
- ✅ Scan uploaded files (optional)

### Monitoring & Logging

- ✅ Log all authentication attempts
- ✅ Log all authorization failures
- ✅ Monitor rate limit violations
- ✅ Track unusual access patterns
- ✅ Set up alerts for security events

## Security Checklist for Production

### Pre-Deployment

- [ ] All dependencies updated to latest secure versions
- [ ] Security audit completed (`npm audit`)
- [ ] Environment variables properly configured
- [ ] HTTPS enforced
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] Input sanitization implemented
- [ ] Error messages don't leak sensitive information

### Post-Deployment

- [ ] Security headers verified (securityheaders.com)
- [ ] SSL certificate valid (ssllabs.com)
- [ ] Authentication flows tested
- [ ] Authorization checks verified
- [ ] Rate limiting tested
- [ ] File upload security tested
- [ ] Payment flow security verified
- [ ] Monitoring and alerting configured

### Ongoing

- [ ] Weekly security log review
- [ ] Monthly dependency updates
- [ ] Quarterly security audits
- [ ] Quarterly secret rotation
- [ ] Annual penetration testing

## Known Security Considerations

### Client-Side DRM Limitations

The DRM protection is implemented client-side and provides deterrence rather than absolute protection:

- **Screen Recording**: Cannot be prevented at the browser level
- **Screenshots**: Cannot be fully blocked on all platforms
- **Browser Extensions**: May bypass some protections
- **DevTools**: Detection can be circumvented by advanced users

**Mitigation**: Dynamic watermarking with viewer email provides traceability for unauthorized distribution.

### Rate Limiting in Distributed Systems

The current rate limiting implementation uses in-memory storage:

- **Limitation**: Not shared across multiple server instances
- **Recommendation**: Use Redis for production deployments with multiple servers

### IP Geolocation

IP-based geolocation is optional and has limitations:

- **VPN/Proxy**: Can mask real location
- **Privacy**: Consider GDPR implications
- **Accuracy**: May not be precise

## Compliance

### GDPR Considerations

If serving EU users:
- Implement cookie consent
- Provide data export functionality
- Implement data deletion (right to be forgotten)
- Update privacy policy
- Maintain data processing records

### Data Retention

- User data: Retained until account deletion
- View analytics: Retained indefinitely (consider implementing retention policy)
- Logs: Recommend 90-day retention
- Backups: 30-day retention recommended

## Security Updates

This document is reviewed and updated quarterly. Last update: November 2025

## Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/app/building-your-application/configuring/security)
- [Supabase Security](https://supabase.com/docs/guides/platform/security)
- [Vercel Security](https://vercel.com/docs/security)

## Contact

For security questions or concerns:
- Email: [security@your-domain.com]
- Security Team: [team contact]

---

**Version**: 1.0.0  
**Last Updated**: November 2025
