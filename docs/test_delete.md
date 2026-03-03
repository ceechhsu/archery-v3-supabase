# Diagnose Session Delete Issue

## Step 1: Run SQL Diagnostic

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the contents of `diagnose_rls.sql`
3. Click **Run**
4. Look at the results:

### What to look for:

| Result | Meaning |
|--------|---------|
| `rls_enabled = false` | RLS is disabled - anyone can delete anything |
| `delete_policy_count = 0` | No DELETE policy exists |
| `delete_policy_count >= 1` | DELETE policy exists (may be wrong though) |

## Step 2: Check Browser Console

1. Open your app in browser
2. Open **Developer Tools** (F12)
3. Go to **Console** tab
4. Click the trash can to delete a session
5. Look for red error messages

Common errors:
- `new row violates row-level security policy` → Policy is blocking it
- `JWT expired` → User session expired
- `permission denied` → No policy or wrong policy
- `Network error` → Connection issue

## Step 3: Test in Supabase Dashboard

1. Go to **Supabase Dashboard** → **Table Editor** → **sessions**
2. Find a session you own (check user_id column matches your auth ID)
3. Try to delete it manually
4. If it works there but not in app → Frontend issue
5. If it fails there too → RLS policy issue

## Quick Fix (if DELETE policy is missing)

Run this in SQL Editor:

```sql
-- Add DELETE policy if missing
CREATE POLICY "Users can delete their own sessions"
ON public.sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
```

## Report Back

Tell me what you find from Steps 1-3 and I'll help you fix it!
