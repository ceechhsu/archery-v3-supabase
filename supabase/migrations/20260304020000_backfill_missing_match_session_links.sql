-- Backfill missing sessions.match_id links for completed matches.
-- Safety rules:
-- 1) Link directly from canonical match session pointers when available.
-- 2) If pointer is missing, only link when exactly one obvious submitted candidate exists
--    for that user near the match time window.

-- Step 1: Deterministic link from existing match pointers.
UPDATE public.sessions AS s
SET
  match_id = m.id,
  updated_at = now()
FROM public.matches AS m
WHERE s.match_id IS NULL
  AND m.status = 'completed'
  AND (
    (m.challenger_session_id = s.id AND s.user_id = m.challenger_user_id)
    OR
    (m.opponent_session_id = s.id AND s.user_id = m.opponent_user_id)
  );

-- Step 2: Conservative heuristic for completed matches with missing pointers.
WITH candidate_sessions AS (
  SELECT
    m.id AS match_id,
    side.role,
    side.user_id,
    s.id AS session_id,
    abs(extract(epoch FROM (
      s.created_at - coalesce(m.completed_at, m.updated_at, m.created_at)
    ))) AS time_distance_seconds,
    row_number() OVER (
      PARTITION BY m.id, side.role
      ORDER BY abs(extract(epoch FROM (
        s.created_at - coalesce(m.completed_at, m.updated_at, m.created_at)
      ))), s.created_at DESC
    ) AS rank_in_role,
    count(*) OVER (PARTITION BY m.id, side.role) AS candidate_count
  FROM public.matches AS m
  JOIN LATERAL (
    VALUES
      ('challenger'::text, m.challenger_user_id),
      ('opponent'::text, m.opponent_user_id)
  ) AS side(role, user_id) ON true
  JOIN public.sessions AS s
    ON s.user_id = side.user_id
  WHERE m.status = 'completed'
    AND side.user_id IS NOT NULL
    AND s.match_id IS NULL
    AND s.is_submitted_to_match = true
    AND s.created_at BETWEEN m.created_at - interval '6 hours'
                        AND coalesce(m.completed_at, m.updated_at, m.created_at) + interval '6 hours'
    AND (
      (side.role = 'challenger' AND m.challenger_session_id IS NULL)
      OR
      (side.role = 'opponent' AND m.opponent_session_id IS NULL)
    )
)
UPDATE public.sessions AS s
SET
  match_id = c.match_id,
  updated_at = now()
FROM candidate_sessions AS c
WHERE s.id = c.session_id
  AND c.rank_in_role = 1
  AND c.candidate_count = 1;

-- Step 3: Rehydrate missing match session pointers when exactly one submitted linked session exists.
WITH role_sessions AS (
  SELECT
    m.id AS match_id,
    'challenger'::text AS role,
    s.id AS session_id,
    row_number() OVER (PARTITION BY m.id, 'challenger' ORDER BY s.created_at DESC) AS rank_in_role,
    count(*) OVER (PARTITION BY m.id, 'challenger') AS candidate_count
  FROM public.matches AS m
  JOIN public.sessions AS s
    ON s.match_id = m.id
   AND s.user_id = m.challenger_user_id
   AND s.is_submitted_to_match = true
  WHERE m.status = 'completed'
    AND m.challenger_session_id IS NULL

  UNION ALL

  SELECT
    m.id AS match_id,
    'opponent'::text AS role,
    s.id AS session_id,
    row_number() OVER (PARTITION BY m.id, 'opponent' ORDER BY s.created_at DESC) AS rank_in_role,
    count(*) OVER (PARTITION BY m.id, 'opponent') AS candidate_count
  FROM public.matches AS m
  JOIN public.sessions AS s
    ON s.match_id = m.id
   AND s.user_id = m.opponent_user_id
   AND s.is_submitted_to_match = true
  WHERE m.status = 'completed'
    AND m.opponent_session_id IS NULL
)
UPDATE public.matches AS m
SET
  challenger_session_id = CASE
    WHEN rs.role = 'challenger' THEN rs.session_id
    ELSE m.challenger_session_id
  END,
  opponent_session_id = CASE
    WHEN rs.role = 'opponent' THEN rs.session_id
    ELSE m.opponent_session_id
  END,
  updated_at = now()
FROM role_sessions AS rs
WHERE m.id = rs.match_id
  AND rs.rank_in_role = 1
  AND rs.candidate_count = 1;
