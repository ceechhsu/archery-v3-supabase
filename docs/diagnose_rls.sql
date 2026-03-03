-- Diagnostic Script for Session Delete Issues
-- Run this in Supabase SQL Editor to check RLS policies

-- ============================================
-- 1. CHECK IF RLS IS ENABLED
-- ============================================
SELECT 
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname IN ('sessions', 'ends', 'shots')
AND relkind = 'r';

-- ============================================
-- 2. CHECK CURRENT RLS POLICIES
-- ============================================
SELECT 
    tablename,
    policyname,
    permissive,
    roles,
    cmd as command,
    qual as using_expression,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('sessions', 'ends', 'shots')
ORDER BY tablename, policyname;

-- ============================================
-- 3. CHECK IF YOU HAVE DELETE POLICY
-- ============================================
SELECT 
    COUNT(*) as delete_policy_count
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'sessions'
AND cmd = 'DELETE';

-- ============================================
-- 4. CREATE MISSING DELETE POLICY (if needed)
-- ============================================
-- Uncomment and run this if no DELETE policy exists:

-- DROP POLICY IF EXISTS "Users can delete their own sessions" ON public.sessions;
-- 
-- CREATE POLICY "Users can delete their own sessions"
-- ON public.sessions
-- FOR DELETE
-- TO authenticated
-- USING (auth.uid() = user_id);

-- ============================================
-- 5. VERIFY TABLE STRUCTURE
-- ============================================
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'sessions'
ORDER BY ordinal_position;

-- ============================================
-- 6. TEST DELETE (as admin - this will work)
-- ============================================
-- This shows you how many sessions exist:
SELECT COUNT(*) as total_sessions FROM public.sessions;

-- ============================================
-- NOTES FOR FIXING:
-- ============================================
-- If delete_policy_count = 0, run section 4 above
-- 
-- If RLS is disabled (rls_enabled = false), enable it:
-- ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
--
-- Common issues:
-- 1. Missing DELETE policy
-- 2. Policy checking wrong column (user_id vs auth.uid())
-- 3. Policy restricted to specific roles
