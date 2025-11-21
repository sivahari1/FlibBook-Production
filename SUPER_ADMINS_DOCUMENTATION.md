# FlipBook DRM - Super Admins Documentation

## 🔐 Super Admin Accounts

This platform has **TWO SUPER ADMINS** with equal privileges and full platform control.

---

## Admin 1: Siva Ram

**Name:** J. Siva Ramakrishna  
**Email:** `sivaramj83@gmail.com`  
**Password:** `Admin123!`  
**Role:** ADMIN (Super Admin)  
**Status:** ✅ Active & Verified  
**Created:** Earlier setup

### Login Credentials
```
Email: sivaramj83@gmail.com
Password: Admin123!
```

---

## Admin 2: Hariharan R

**Name:** Hariharan R  
**Email:** `hariharanr@gmail.com`  
**Password:** `Admin@123`  
**Role:** ADMIN (Super Admin)  
**Status:** ✅ Active & Verified  
**Created:** Recently added

### Login Credentials
```
Email: hariharanr@gmail.com
Password: Admin@123
```

---

## 🎯 Super Admin Capabilities

Both admins have **FULL ACCESS** to all platform features:

### User Management
- Create, edit, and delete users
- Manage user roles (ADMIN, USER, READER, MEMBER)
- Reset user passwords
- Activate/deactivate user accounts
- View user analytics

### Member Management
- View all members
- Manage member subscriptions
- Reset member passwords
- Toggle member active status
- View member purchase history

### Bookshop Management
- Add new items to the bookshop
- Edit existing bookshop items
- Delete bookshop items
- Set pricing and descriptions
- Upload PDF files for sale

### Payment Management
- View all payment transactions
- Verify payments
- Manage payment status
- View payment analytics

### Access Request Management
- Review access requests
- Approve/reject requests
- Manage pending requests
- View request history

### System Administration
- Full platform configuration
- Security settings
- System monitoring
- Audit logs access

---

## 🔒 Security Notes

⚠️ **IMPORTANT SECURITY RECOMMENDATIONS:**

1. **Change Default Passwords**
   - Both admins should change their passwords immediately after first login
   - Use strong, unique passwords (minimum 12 characters)
   - Include uppercase, lowercase, numbers, and special characters

2. **Enable Two-Factor Authentication** (if available)
   - Add an extra layer of security to admin accounts

3. **Regular Password Updates**
   - Change passwords every 90 days
   - Never share passwords via email or unsecured channels

4. **Secure Access**
   - Always log out after admin sessions
   - Use secure networks (avoid public WiFi)
   - Keep browser and system updated

---

## 📍 Admin Access URLs

### Local Development
```
Login: http://localhost:3000/login
Admin Dashboard: http://localhost:3000/admin
```

### Production
```
Login: https://jstudyroom.dev/login
Admin Dashboard: https://jstudyroom.dev/admin
```

---

## 🛠️ Password Reset Scripts

If either admin needs to reset their password:

### For Siva Ram (sivaramj83@gmail.com)
```bash
# Run the existing script
npx tsx prisma/reset-admin-password.ts
```

### For Hariharan R (hariharanr@gmail.com)
```bash
# Run the Hariharan admin script
npx tsx prisma/create-hariharan-admin.ts
```

---

## 👥 Admin Responsibilities

### Siva Ram - Primary Responsibilities
- Overall platform oversight
- Technical architecture decisions
- System configuration
- Developer coordination

### Hariharan R - Primary Responsibilities
- Content management
- User support
- Bookshop curation
- Member management

**Note:** Both admins have equal access and can perform all functions. The above is just a suggested division of responsibilities.

---

## 📞 Contact Information

### Siva Ram
- Email: sivaramj83@gmail.com
- Role: Technical Lead & Super Admin

### Hariharan R
- Email: hariharanr@gmail.com
- Role: Operations Lead & Super Admin

---

## 🎨 Platform Branding

**Designed and Developed by:** JYOSRIK & WIKWIL  
**Powered by:** DeepTech.Inc

---

## 📝 Change Log

| Date | Admin | Change |
|------|-------|--------|
| Earlier | Siva Ram | Initial super admin created |
| ${new Date().toLocaleDateString()} | Hariharan R | Second super admin added |

---

## ⚡ Quick Reference

### Admin Dashboard Sections
- `/admin` - Main dashboard
- `/admin/users` - User management
- `/admin/members` - Member management
- `/admin/bookshop` - Bookshop management
- `/admin/payments` - Payment verification
- `/admin/access-requests` - Access request management

### Common Admin Tasks
1. **Add Bookshop Item:** Admin → Bookshop → Add New Item
2. **Verify Payment:** Admin → Payments → Select Payment → Verify
3. **Create User:** Admin → Users → Create New User
4. **Reset Member Password:** Admin → Members → Select Member → Reset Password
5. **Approve Access Request:** Admin → Access Requests → Review → Approve

---

**Last Updated:** ${new Date().toLocaleString()}  
**Document Version:** 1.0
