# Archery V3 - Project Status

**Date:** March 2, 2026  
**Last Commit:** c102c2a - "fix: simplify client.ts to fix TypeScript error"

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

### Supabase Site URL (CRITICAL)
**Current Setting:** `http://localhost:3000` (for local dev)

**For Production:** Must change to `https://archery-v3-supabase.vercel.app`
- Location: Supabase Dashboard → Auth → URL Configuration
- Note: Only ONE Site URL allowed, so switch back/forth for dev vs prod

**Impact:** Auth will fail on production until this is changed.

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
- **Production:** ⚠️ Needs Supabase Site URL update
- **Last Deploy:** Commit c102c2a (TypeScript fix)

---

## 🎯 Next Steps / Future Features

### Immediate
1. Update Supabase Site URL to production
2. Test production deployment
3. Verify session CRUD works on production

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
4. **Production config needed** - remember to switch Site URL

When resuming:
- Check if Supabase Site URL is set correctly for your environment
- Test a session create/edit/delete to verify everything works
- Consider implementing 1-vs-1 matches if production is stable
