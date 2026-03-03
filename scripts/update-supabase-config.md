# Supabase Production Configuration

## Required Changes for Production

### 1. Update Site URL

Go to Supabase Dashboard → Auth → URL Configuration:

**Current (Local Dev):**
- Site URL: `http://localhost:3000`

**Change To (Production):**
- Site URL: `https://archery-v3-supabase.vercel.app`

### 2. Update Redirect URLs

In the same section, update Redirect URLs to allow:

```
https://archery-v3-supabase.vercel.app/**
https://archery-v3-supabase-o2gpxn04i-ceechhsus-projects.vercel.app/**
```

Or use a wildcard for all Vercel preview deployments:
```
https://*.vercel.app/**
```

### 3. Verify Google OAuth Settings

Go to Auth → Providers → Google:
- Ensure Google OAuth is enabled
- Verify callback URL in Google Cloud Console includes:
  - `https://archery-v3-supabase.vercel.app/auth/callback`

---

## Quick Checklist

- [ ] Site URL changed to `https://archery-v3-supabase.vercel.app`
- [ ] Redirect URLs include production domain
- [ ] Google OAuth callback URL updated in Google Cloud Console
- [ ] Test login on production
- [ ] Test session creation
- [ ] Test session editing
- [ ] Test session deletion

## Switching Back to Local Dev

When developing locally, change the Site URL back to:
- Site URL: `http://localhost:3000`
