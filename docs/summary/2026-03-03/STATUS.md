# Archery V3 - Project Status

**Date:** March 3, 2026  
**Last Commit:** Production deployment completed

---

## ✅ Working Features

### Authentication
- Google OAuth login/logout working
- Session cookies properly configured with `@supabase/ssr`
- RLS policies updated to allow CRUD operations
- Middleware handles auth redirects correctly

### Sessions
- Create new practice sessions
- Edit existing sessions
- Delete sessions (permanently from DB)
- View session history on dashboard
- Expand/collapse session details

### Date/Time Handling
- Sessions save with correct local timezone
- Calendar displays sessions on correct dates
- Time displays in user's local timezone
- No more UTC date shifting issues

### UI
- Mobile responsive
- Welcome message visible on all screen sizes
- Calendar view with month navigation
- Session cards with end details and photo thumbnails

---

## ⚠️ Known Issues / Configuration Notes

### Supabase Site URL (CRITICAL - ACTION REQUIRED)
**Current Setting:** `http://localhost:3000` (for local dev)

**Production Deployment:** ✅ Live at https://archery-v3-supabase.vercel.app

**Required Action:** Update Supabase Auth URL Configuration
- **Location:** Supabase Dashboard → Auth → URL Configuration
- **Site URL:** Change to `https://archery-v3-supabase.vercel.app`
- **Redirect URLs:** Add `https://archery-v3-supabase.vercel.app/**`
- **Note:** Only ONE Site URL allowed, so switch back/forth for dev vs prod

**Impact:** Auth will fail on production until this is changed. See instructions in `scripts/update-supabase-config.md`

---

## 🗄️ Database Schema

### Tables
- `sessions` - practice sessions
- `ends` - individual ends per session
- `shots` - individual shots per end

### RLS Policies (Working)
All tables have RLS enabled with policies for authenticated users to manage their own data.

---

## 📁 Key Files Modified

| File | Purpose |
|------|---------|
| `src/utils/supabase/client.ts` | Browser client with cookie handling |
| `src/utils/supabase/server.ts` | Server client for SSR |
| `src/utils/supabase/middleware.ts` | Auth middleware |
| `src/app/auth/callback/route.ts` | OAuth callback handler |
| `src/app/log/ScorecardClient.tsx` | Session creation/editing |
| `src/app/components/DashboardClient.tsx` | Session list & delete |
| `src/app/page.tsx` | Main dashboard page |

---

## 🚀 Deployment Status

- **Local:** ✅ Working (localhost:3000)
- **Production:** ✅ Deployed at https://archery-v3-supabase.vercel.app
- **Last Deploy:** Commit 2bfe66a (Status update)

---

## 🎯 Next Steps / Future Features

### Immediate
1. ✅ Deploy to production - **DONE**
2. ⚠️ Update Supabase Site URL to production (see instructions below)
3. Test production deployment (auth & sessions)

### Supabase Configuration Required

The production deployment is live, but Supabase Auth needs to be configured for the production domain:

**Go to Supabase Dashboard → Auth → URL Configuration:**

| Setting | Current Value | Change To |
|---------|--------------|-----------|
| Site URL | `http://localhost:3000` | `https://archery-v3-supabase.vercel.app` |
| Redirect URLs | localhost | Add `https://archery-v3-supabase.vercel.app/**` |

**Detailed instructions:** See `scripts/update-supabase-config.md`

### Future (V2+)
- 1-vs-1 matches feature (was removed from this version)
- Tournament support
- Photo uploads to Supabase Storage
- Analytics dashboard

---

## 🔧 Environment Variables

Required in `.env.local` and Vercel:
```
NEXT_PUBLIC_SUPABASE_URL=https://uoxgyoklyrpcnwagzoxs.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVveGd5b2tseXJwY253YWd6b3hzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIzNDAzMzMsImV4cCI6MjA4NzkxNjMzM30.9rcCX5AdTaRKRC5Ggtk_Z4Sn8GcWzVZZsQ02k3O3z-4
```

---

## 📝 Notes for Next Session

1. **Auth is solid** - cookie handling works correctly
2. **Timezone is fixed** - no more date shifting issues
3. **Mobile UI improved** - welcome message always visible
4. **Production deployed** - live at https://archery-v3-supabase.vercel.app
5. **Supabase config pending** - Site URL needs manual update in dashboard

When resuming:
1. Go to Supabase Dashboard → Auth → URL Configuration
2. Change Site URL from `http://localhost:3000` to `https://archery-v3-supabase.vercel.app`
3. Add production redirect URLs
4. Test login on https://archery-v3-supabase.vercel.app
5. Test session CRUD operations on production

**To switch back to local dev:**
- Change Site URL back to `http://localhost:3000` in Supabase Dashboard
