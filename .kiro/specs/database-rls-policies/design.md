# Design Document

## Overview

This design implements Row Level Security (RLS) policies for all database tables in the JStudyroom platform using PostgreSQL's native RLS feature through Supabase. The implementation will create a defense-in-depth security model where data access is controlled at both the application layer (existing) and database layer (new).

The design follows a role-based access control (RBAC) pattern with three primary roles:
- **ADMIN**: Full access to all data
- **MEMBER**: Access to owned data and purchased/shared content
- **PLATFORM_USER**: Limited access to shared content

## Architecture

### Security Layers

```
┌─────────────────────────────────────────┐
│     Application Layer (Next.js API)     │
│  - Authentication checks                │
│  - Business logic validation            │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│     Database Layer (PostgreSQL RLS)     │
│  - Row-level access control             │
│  - Policy enforcement                   │
│  - Automatic filtering                  │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│          Data Storage                   │
└─────────────────────────────────────────┘
```

### Policy Structure

Each table will have policies for four operations:
1. **SELECT**: Controls which rows users can read
2. **INSERT**: Controls which rows users can create
3. **UPDATE**: Controls which rows users can modify
4. **DELETE**: Controls which rows users can remove

### Access Patterns

1. **Owner-based**: User can only access their own data (users, subscriptions, payments)
2. **Document-based**: Access follows document ownership and sharing (documents, document_pages, annotations)
3. **Admin-privileged**: Admins have full access (all tables)
4. **Public-filtered**: Users see only published/public content (book_shop_items)

## Components and Interfaces

### SQL Migration Script

**File**: `prisma/migrations/YYYYMMDD_enable_rls_policies/migration.sql`

The migration will:
1. Enable RLS on all tables
2. Create policies for each table and operation
3. Grant necessary permissions
4. Verify policy creation

### Verification Script

**File**: `scripts/verify-rls-policies.ts`

TypeScript script to:
1. Test each policy with different user roles
2. Verify access is properly restricted
3. Confirm admin access works
4. Generate test report

### Rollback Script

**File**: `scripts/rollback-rls-policies.ts`

Script to:
1. Disable RLS on all tables
2. Drop all policies
3. Restore previous state

## Data Models

### Policy Naming Convention

```
<operation>_<table>_<role>_<condition>
```

Examples:
- `select_users_own_record`
- `select_documents_admin_all`
- `insert_documents_owner_only`

### Helper Functions

```sql
-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = auth.uid()::text
    AND "userRole" = 'ADMIN'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user owns document
CREATE OR REPLACE FUNCTION owns_document(doc_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM documents
    WHERE id = doc_id
    AND "userId" = auth.uid()::text
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user can access document
CREATE OR REPLACE FUNCTION can_access_document(doc_id TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    -- Owner
    SELECT 1 FROM documents
    WHERE id = doc_id AND "userId" = auth.uid()::text
  ) OR EXISTS (
    -- Shared via email
    SELECT 1 FROM document_shares ds
    JOIN documents d ON ds."documentId" = d.id
    WHERE d.id = doc_id
    AND (
      ds."sharedWithUserId" = auth.uid()::text
      OR ds."sharedWithEmail" = (SELECT email FROM users WHERE id = auth.uid()::text)
    )
  ) OR EXISTS (
    -- Shared via link
    SELECT 1 FROM share_links sl
    JOIN documents d ON sl."documentId" = d.id
    WHERE d.id = doc_id
    AND sl."isActive" = true
    AND (sl."expiresAt" IS NULL OR sl."expiresAt" > NOW())
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, several patterns emerge that can be consolidated:

**Redundancy identified:**
- Many tables have identical "user can only see own records" patterns (users, subscriptions, payments, my_jstudyroom_items, verification_tokens)
- Many tables have identical "prevent updates" and "prevent deletes" patterns
- Admin access patterns are consistent across all tables

**Consolidated properties:**
- Instead of separate properties for each table's "own records only" pattern, we'll create a general ownership property
- Instead of separate properties for each table's "admin sees all" pattern, we'll create a general admin privilege property
- Document-based access can be consolidated into document access inheritance properties

### Core Properties

Property 1: User record isolation
*For any* non-admin user, querying the users table should return only their own user record and no other users' records
**Validates: Requirements 2.1**

Property 2: Admin full access
*For any* admin user and any table, querying should return all records without restriction
**Validates: Requirements 2.2, 3.5, 5.5, 8.5, 9.5, 10.5, 11.5, 13.3, 14.3, 15.2**

Property 3: Ownership-based updates
*For any* user and any table with a userId field, updates should succeed only when the userId matches the authenticated user's ID
**Validates: Requirements 2.3, 3.3, 4.3, 5.3, 6.3, 12.3**

Property 4: Ownership-based deletes
*For any* user and any table with a userId field, deletes should succeed only when the userId matches the authenticated user's ID
**Validates: Requirements 2.4, 3.4, 4.4, 5.4, 6.4, 10.4, 12.4**

Property 5: Document access inheritance
*For any* user and any document-related table (document_pages, document_annotations, view_analytics), access should be granted if and only if the user has access to the parent document
**Validates: Requirements 4.1, 4.5, 11.1, 12.1**

Property 6: Automatic ownership assignment
*For any* user creating a record in a table with a userId field, the userId should be automatically set to the authenticated user's ID
**Validates: Requirements 3.2, 5.2, 6.2, 7.2, 8.2, 9.2, 10.2, 12.2**

Property 7: Share visibility
*For any* user, querying document_shares should return shares where they are either the creator (sharedByUserId) or the recipient (sharedWithUserId or sharedWithEmail matches)
**Validates: Requirements 6.1, 6.5**

Property 8: Immutable records
*For any* user attempting to update or delete records in immutable tables (verification_tokens, subscriptions, payments, view_analytics, error_logs), the operation should be prevented
**Validates: Requirements 7.3, 7.4, 8.3, 8.4, 9.3, 9.4, 11.3, 11.4, 14.4, 14.5**

Property 9: Published content filter
*For any* non-admin user querying book_shop_items, only records where isPublished = true should be returned
**Validates: Requirements 15.1**

Property 10: Admin-only mutations
*For any* non-admin user attempting to create or update book_shop_items, the operation should be prevented
**Validates: Requirements 15.3, 15.4, 15.5**

Property 11: Access request visibility
*For any* non-admin user querying access_requests, only requests where their email matches the request email should be returned
**Validates: Requirements 13.2**

Property 12: Policy enforcement across operations
*For any* table with RLS enabled and any operation type (SELECT, INSERT, UPDATE, DELETE), policies should be enforced consistently
**Validates: Requirements 1.2**

## Error Handling

### Policy Violation Errors

When RLS policies block an operation, PostgreSQL returns:
```
Error: new row violates row-level security policy
```

The application should:
1. Catch these errors at the API layer
2. Return appropriate HTTP status codes (403 Forbidden)
3. Log security violations for audit
4. Provide user-friendly error messages

### Migration Errors

If RLS enablement fails:
1. Rollback the entire migration
2. Log the specific table/policy that failed
3. Notify administrators
4. Maintain system availability

### Performance Considerations

RLS policies add query overhead. To mitigate:
1. Use indexes on userId and documentId fields (already exist)
2. Create helper functions with SECURITY DEFINER for complex checks
3. Cache policy evaluation results where possible
4. Monitor query performance after deployment

## Testing Strategy

### Unit Testing

Unit tests will verify:
1. Policy SQL syntax is valid
2. Helper functions return correct boolean values
3. Policy conditions match requirements
4. Edge cases (null values, missing relations)

### Property-Based Testing

We'll use a PostgreSQL testing framework to implement property-based tests:

**Framework**: pgTAP (PostgreSQL Testing Framework)

**Configuration**: Each property test will run with at least 100 random test cases

**Test Structure**:
```sql
-- Example property test
BEGIN;
SELECT plan(100);

-- Generate 100 random users and test Property 1
SELECT lives_ok(
  format('
    SET LOCAL ROLE authenticated;
    SET LOCAL request.jwt.claim.sub = %L;
    SELECT * FROM users WHERE id != %L;
  ', user_id, user_id),
  'User can only see own record'
) FROM generate_test_users(100);

SELECT finish();
ROLLBACK;
```

**Property Test Tags**:
Each property-based test will include a comment:
```sql
-- **Feature: database-rls-policies, Property 1: User record isolation**
```

### Integration Testing

Integration tests will:
1. Test cross-table access patterns (documents → document_pages)
2. Verify sharing workflows work end-to-end
3. Test admin privilege escalation
4. Verify application code continues to work

### Test Data Setup

```typescript
// Test user factory
function createTestUser(role: UserRole) {
  return {
    id: cuid(),
    email: `test-${cuid()}@example.com`,
    userRole: role,
    // ... other fields
  };
}

// Test document factory
function createTestDocument(userId: string) {
  return {
    id: cuid(),
    userId,
    title: `Test Document ${cuid()}`,
    // ... other fields
  };
}
```

### Security Testing

Specific security tests:
1. **Privilege Escalation**: Verify users cannot access admin-only data
2. **Horizontal Access**: Verify users cannot access other users' data
3. **SQL Injection**: Verify policies are not vulnerable to injection
4. **Bypass Attempts**: Test direct PostgREST API calls

## Deployment Strategy

### Phase 1: Preparation
1. Create helper functions
2. Add indexes if needed
3. Test policies in development

### Phase 2: Staged Rollout
1. Enable RLS on non-critical tables first (error_logs, view_analytics)
2. Monitor for issues
3. Enable on critical tables (users, documents)
4. Monitor application behavior

### Phase 3: Verification
1. Run automated test suite
2. Verify no legitimate access is blocked
3. Confirm security violations are blocked
4. Check performance metrics

### Phase 4: Monitoring
1. Set up alerts for policy violations
2. Monitor query performance
3. Track error rates
4. Audit access patterns

## Rollback Plan

If issues arise:
1. Disable RLS on affected tables immediately
2. Investigate root cause
3. Fix policies in development
4. Re-deploy with fixes

Rollback script:
```sql
-- Disable RLS on all tables
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE documents DISABLE ROW LEVEL SECURITY;
-- ... for all tables

-- Drop all policies
DROP POLICY IF EXISTS select_users_own_record ON users;
-- ... for all policies
```

## Performance Optimization

### Indexing Strategy

Ensure indexes exist on:
- `users.id` and `users.userRole` (already exist)
- `documents.userId` (already exists)
- `document_shares.sharedWithEmail` (already exists)
- All foreign key fields (already exist)

### Query Optimization

1. Use `SECURITY DEFINER` functions for complex checks
2. Avoid subqueries in policies where possible
3. Use EXISTS instead of IN for better performance
4. Cache auth.uid() result in policies

### Monitoring

Track:
- Query execution time before/after RLS
- Policy evaluation overhead
- Number of policy violations
- Failed access attempts

## Security Considerations

### Defense in Depth

RLS provides database-level security but doesn't replace:
- Application-level authorization checks
- Input validation
- Rate limiting
- Audit logging

### Service Role Access

The service role (used by application code) bypasses RLS. Ensure:
- Service role credentials are secure
- Application code properly validates access
- Service role is only used by trusted application code

### Audit Trail

Log all policy violations:
```sql
CREATE TABLE rls_violations (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT,
  table_name TEXT,
  operation TEXT,
  attempted_at TIMESTAMP DEFAULT NOW()
);
```

## Documentation

### Developer Guide

Document for developers:
1. How RLS policies work
2. How to test with different roles
3. How to add new policies
4. Common troubleshooting steps

### Operations Guide

Document for ops team:
1. How to monitor RLS performance
2. How to investigate policy violations
3. How to rollback if needed
4. Emergency procedures
