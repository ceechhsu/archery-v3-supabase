-- Supabase Schema for Archery V3
-- Includes Tables, Row Level Security (RLS) Policies, and Storage Setup

-- 1. Create Tables

CREATE TABLE public.sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    session_date TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    distance INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.ends (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES public.sessions(id) ON DELETE CASCADE,
    end_index INTEGER NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE TABLE public.shots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    end_id UUID NOT NULL REFERENCES public.ends(id) ON DELETE CASCADE,
    shot_index INTEGER NOT NULL,
    score INTEGER NOT NULL,
    is_x BOOLEAN DEFAULT FALSE NOT NULL,
    is_m BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 2. Enable Row Level Security (RLS)

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ends ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shots ENABLE ROW LEVEL SECURITY;

-- 3. Define RLS Policies
-- Users can only read/insert/update/delete their own sessions
-- Because ends and shots cascade from sessions, we can secure them by checking the session owner

-- Policies for sessions
CREATE POLICY "Users can manage their own sessions"
ON public.sessions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for ends
CREATE POLICY "Users can manage ends for their sessions"
ON public.ends
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.sessions
        WHERE sessions.id = ends.session_id
        AND sessions.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.sessions
        WHERE sessions.id = ends.session_id
        AND sessions.user_id = auth.uid()
    )
);

-- Policies for shots
CREATE POLICY "Users can manage shots for their ends"
ON public.shots
FOR ALL
USING (
    EXISTS (
        SELECT 1 FROM public.ends
        JOIN public.sessions ON sessions.id = ends.session_id
        WHERE ends.id = shots.end_id
        AND sessions.user_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.ends
        JOIN public.sessions ON sessions.id = ends.session_id
        WHERE ends.id = shots.end_id
        AND sessions.user_id = auth.uid()
    )
);

-- 4. Storage Bucket Setup
-- NOTE: In Supabase dashboard, you may need to manually create the bucket 'session_photos' as a private bucket, 
-- or you can use the SQL below if running on raw postgres with storage schema available.

INSERT INTO storage.buckets (id, name, public) 
VALUES ('session_photos', 'session_photos', false)
ON CONFLICT DO NOTHING;

-- Storage Policies for session_photos (Only owner can read/write)
CREATE POLICY "Users can upload their own photos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'session_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can read their own photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'session_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own photos"
ON storage.objects FOR DELETE
USING (bucket_id = 'session_photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Note on structure: 
-- Upload your photos using the path: `<user_id>/<session_id>/<end_id>.jpg`
-- This naturally enforces the RLS policy checking the folder name.
