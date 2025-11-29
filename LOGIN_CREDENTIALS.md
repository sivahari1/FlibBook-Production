# 🔐 Login Credentials - Quick Reference

## ✅ Ready to Use

### Admin Login
```
Email: sivaramj83@gmail.com
Password: Admin@123
```

OR

```
Email: hariharanr@gmail.com
Password: Admin@123
```

## 🚀 How to Login

1. **Start the server:**
   ```bash
   npm run dev
   ```

2. **Open your browser:**
   ```
   http://localhost:3000/login
   ```

3. **Enter credentials** from above

4. **You'll be redirected** to your dashboard based on your role

## ⚠️ Important Notes

- Both accounts are **ADMIN** role
- Both accounts are **ACTIVE** and **EMAIL VERIFIED**
- If login fails, check:
  - Browser console for errors
  - Terminal for server errors
  - Clear browser cookies/cache

## 🔧 Troubleshooting

If you get authentication errors:

1. **Restart the dev server:**
   ```bash
   # Press Ctrl+C to stop
   npm run dev
   ```

2. **Clear browser data:**
   - Open DevTools (F12)
   - Application tab → Clear storage
   - Reload page

3. **Verify database connection:**
   ```bash
   npx tsx scripts/test-login.ts
   ```

## 📝 Need to Reset Password?

Edit and run:
```bash
npx tsx scripts/reset-siva-account.ts
```

Change the email and password in the script as needed.
