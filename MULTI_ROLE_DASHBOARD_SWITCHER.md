# Multi-Role Dashboard Switcher Implementation

## Overview

This feature allows users to have multiple roles and seamlessly switch between different dashboards. For example, a user can be both a PLATFORM_USER and a MEMBER, giving them access to both the Platform Dashboard and the Member Dashboard.

## Features

### 1. Multiple Roles Support
- Users can have a primary role (`userRole`) and additional roles (`additionalRoles`)
- The system supports any combination of roles: ADMIN, PLATFORM_USER, MEMBER, READER_USER
- All roles are stored in the database and included in the user session

### 2. Dashboard Switcher Component
- A dropdown component that appears in the navigation bar
- Only visible when a user has multiple roles
- Shows all available dashboards with icons and descriptions
- Highlights the current dashboard
- Smooth navigation between dashboards

### 3. Seamless Integration
- Integrated into both Platform Dashboard (`/dashboard`) and Member Dashboard (`/member`)
- Automatically detects user's available roles
- Maintains session state across dashboard switches

## Database Schema Changes

### Migration: `20251127000000_add_additional_roles`

```sql
ALTER TABLE "users" ADD COLUMN "additionalRoles" "UserRole"[] DEFAULT ARRAY[]::"UserRole"[];
CREATE INDEX "users_additionalRoles_idx" ON "users" USING GIN ("additionalRoles");
```

### Updated User Model

```prisma
model User {
  // ... other fields
  userRole            UserRole            @default(MEMBER)
  additionalRoles     UserRole[]          // NEW: Array of additional roles
  // ... other fields
}
```

## Usage

### For Administrators

#### Adding Additional Roles to Users

Use the provided script to add additional roles to existing users:

```bash
# Add MEMBER role to a PLATFORM_USER
npx ts-node scripts/add-additional-role.ts user@example.com MEMBER

# Add PLATFORM_USER role to a MEMBER
npx ts-node scripts/add-additional-role.ts user@example.com PLATFORM_USER
```

#### Direct Database Update

You can also update roles directly in the database:

```sql
-- Add MEMBER role to a PLATFORM_USER
UPDATE users 
SET "additionalRoles" = ARRAY['MEMBER']::"UserRole"[]
WHERE email = 'user@example.com';

-- Add multiple additional roles
UPDATE users 
SET "additionalRoles" = ARRAY['MEMBER', 'READER_USER']::"UserRole"[]
WHERE email = 'user@example.com';
```

### For Users

1. **Login**: Users log in normally with their credentials
2. **Dashboard Switcher**: If they have multiple roles, a dashboard switcher appears in the top navigation
3. **Switch Dashboards**: Click the switcher to see all available dashboards
4. **Navigate**: Click on any dashboard to switch to it instantly

## Component Details

### DashboardSwitcher Component

Location: `components/common/DashboardSwitcher.tsx`

**Features:**
- Automatically detects user's roles from session
- Only renders if user has 2+ roles
- Dropdown interface with role icons
- Shows current dashboard
- Smooth transitions

**Props:** None (uses session data)

**Example Integration:**

```tsx
import { DashboardSwitcher } from '@/components/common/DashboardSwitcher';

// In your layout
<div className="flex items-center space-x-4">
  <DashboardSwitcher />
  {/* other nav items */}
</div>
```

## Dashboard Mappings

| Role | Dashboard Path | Label | Description |
|------|---------------|-------|-------------|
| ADMIN | `/admin` | Admin Dashboard | Full system access |
| PLATFORM_USER | `/dashboard` | Platform Dashboard | Document management |
| MEMBER | `/member` | Member Dashboard | BookShop access |
| READER_USER | `/reader` | Reader Dashboard | View shared content |

## Authentication Flow

1. User logs in with credentials
2. System retrieves `userRole` and `additionalRoles` from database
3. Both are added to JWT token and session
4. Session includes:
   ```typescript
   {
     user: {
       userRole: 'PLATFORM_USER',
       additionalRoles: ['MEMBER'],
       // ... other fields
     }
   }
   ```
5. DashboardSwitcher reads from session and displays available options

## Security Considerations

- Role validation happens on the server side
- Middleware still enforces role-based access control
- Users can only access dashboards for roles they have
- Session tokens include all role information
- Database constraints ensure data integrity

## Testing

### Test Scenarios

1. **Single Role User**
   - Dashboard switcher should NOT appear
   - User can only access their primary role's dashboard

2. **Dual Role User (PLATFORM_USER + MEMBER)**
   - Dashboard switcher appears
   - Can switch between `/dashboard` and `/member`
   - Both dashboards function normally

3. **Admin with Additional Roles**
   - Can access all dashboards
   - Switcher shows all available options
   - Maintains admin privileges across all dashboards

### Manual Testing Steps

1. Create a test user with PLATFORM_USER role
2. Add MEMBER as additional role using the script
3. Login as that user
4. Verify dashboard switcher appears
5. Switch between dashboards
6. Verify both dashboards work correctly

## Troubleshooting

### Dashboard Switcher Not Appearing

**Possible Causes:**
- User only has one role
- Session not updated after adding additional role
- Component not imported in layout

**Solutions:**
- Verify user has `additionalRoles` in database
- Log out and log back in to refresh session
- Check component import in layout files

### Cannot Access Dashboard After Switching

**Possible Causes:**
- Middleware blocking access
- Role not properly added to session
- Database migration not run

**Solutions:**
- Run database migration: `npx prisma migrate deploy`
- Verify session includes `additionalRoles`
- Check middleware role validation logic

### Session Not Including Additional Roles

**Possible Causes:**
- Auth configuration not updated
- Database field not populated
- Token not refreshed

**Solutions:**
- Verify `lib/auth.ts` includes `additionalRoles` in JWT callback
- Check database has `additionalRoles` column
- Force session refresh by logging out/in

## Future Enhancements

Potential improvements for future versions:

1. **Role Priority System**: Define which role takes precedence for certain actions
2. **Default Dashboard Preference**: Let users set their preferred landing dashboard
3. **Role-Specific Notifications**: Show notifications relevant to each role
4. **Quick Switch Keyboard Shortcut**: Add keyboard shortcuts for power users
5. **Role Activity Tracking**: Track which dashboard users spend most time in
6. **Bulk Role Management**: Admin interface to manage roles for multiple users

## Files Modified

### Core Files
- `prisma/schema.prisma` - Added `additionalRoles` field
- `lib/auth.ts` - Updated to include additional roles in session
- `components/common/DashboardSwitcher.tsx` - New component
- `app/dashboard/layout.tsx` - Added switcher
- `app/member/layout.tsx` - Added switcher

### Migration Files
- `prisma/migrations/20251127000000_add_additional_roles/migration.sql`

### Utility Scripts
- `scripts/add-additional-role.ts` - Helper script for adding roles

### Documentation
- `MULTI_ROLE_DASHBOARD_SWITCHER.md` - This file

## Support

For issues or questions:
1. Check this documentation first
2. Verify database migration is applied
3. Check session data includes additional roles
4. Review component integration in layouts
5. Test with a fresh login

---

**Implementation Date:** November 27, 2024
**Version:** 1.0.0
**Status:** ✅ Complete and Ready for Use
