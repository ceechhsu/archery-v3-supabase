# Archery V3 Supabase - Agent Notes

## Authentication Architecture

### Client-Side Auth (Browser)
- **Storage Method**: Cookies (via @supabase/ssr)
- **Reason**: Session must be shared between server (SSR) and client
- **Implementation**: Uses `@supabase/ssr` createBrowserClient
- **Note**: Chrome's bounce tracking can cause issues; see workaround below

### Server-Side Auth (Middleware)
- **Storage Method**: Cookies (required for SSR)
- **Implementation**: Uses `@supabase/ssr` createServerClient
- **Purpose**: Protect routes and verify auth on server render

### Auth Flow
1. User clicks "Sign in with Google"
2. Supabase OAuth redirect to Google
3. Google redirects back to `/auth/callback`
4. Callback exchanges code for session
5. Session stored in localStorage (client) and cookies (server)
6. Client-side operations use localStorage session
7. Server-side operations use cookie session

## Common Issues

### "User not authenticated" Error
- Check if localStorage has the `archery-auth-token` key
- Verify Chrome isn't blocking third-party cookies (though we use localStorage)
- Check browser console for auth errors

### Chrome Bounce Tracking
Chrome deletes cookies from domains that don't get user interaction within a short time after redirect. This breaks OAuth flows. Solution: Use localStorage for client-side auth state.

## File Structure

```
src/
  utils/supabase/
    client.ts     # Browser client (localStorage)
    server.ts     # Server client (cookies)
    middleware.ts # Middleware session handling
  app/auth/callback/route.ts  # OAuth callback handler
```
