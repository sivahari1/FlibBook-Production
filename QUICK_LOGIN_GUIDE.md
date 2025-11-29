# 🚀 Quick Login Guide

## ⚡ Fast Fix (Do This Now!)

### 1. Restart Dev Server
```bash
# Press Ctrl+C to stop
npm run dev
```

### 2. Clear Browser Cache
- Press `F12` (DevTools)
- Go to `Application` tab
- Click `Clear storage`
- Click `Clear site data`

**OR** just use **Incognito/Private mode**

### 3. Login
Go to: **http://localhost:3000/login**

**Use these credentials:**
```
Email: sivaramj83@gmail.com
Password: Admin@123
```

OR

```
Email: hariharanr@gmail.com
Password: Admin@123
```

## ✅ What Was Fixed

1. **NextAuth configuration** - Fixed redirect callback
2. **Middleware** - Stopped blocking NextAuth API calls
3. **Provider ID** - Added explicit credentials provider ID

## 🔍 If It Still Doesn't Work

### Quick Diagnostic:
```bash
npx tsx scripts/test-login.ts
```

### Common Issues:

**"Too many requests"**
- Wait 1 minute OR restart dev server

**"Invalid email or password"**
- Use EXACT credentials above (copy-paste)
- Check for extra spaces

**Still getting 401**
- Make sure you restarted the server (not just saved files)
- Try a different browser
- Check terminal for errors

## 📝 What Changed

- `lib/auth.ts` - Fixed NextAuth redirect logic
- `middleware.ts` - Fixed rate limiting for auth routes
- Database - Reset passwords to `Admin@123`

## 💡 Pro Tips

1. Always restart dev server after auth config changes
2. Use incognito mode when testing auth
3. Check browser console for specific errors
4. Both admin accounts have same password for easy testing

## 🎯 Expected Result

After login, you should:
- See no errors in console
- Be redirected to `/admin` dashboard
- Have a valid session cookie
- See your user info in the dashboard

---

**Need more help?** Check `LOGIN_FIX_FINAL.md` for detailed technical information.
