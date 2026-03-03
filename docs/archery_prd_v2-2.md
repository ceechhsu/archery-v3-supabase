# Product Requirements Document (PRD)
## Archery Log Web App — V2.2 (Supabase Edition with 1-vs-1 Matches)

**Owner:** Ceech  
**Primary users:** Archers tracking practice sessions, scores, competing with friends, and visualizing progress over time.  
**Platforms:** Web (Responsive PWA built with Next.js & TailwindCSS) — iPhone Safari, Android Chrome, Desktop browsers.  
**Time zone:** User local time for all date/time logic.  
**Architecture Model:** Cloud-first backend using **Supabase** (PostgreSQL DB + Storage + Auth).

---

## 1. Overview

### 1.1 Purpose
Build a robust web app that allows archers to:
- Sign in with Google seamlessly (without triggering scary "unverified app" warnings).
- Log practice sessions, ends, and individual shot details.
- Attach photos of their targets to sessions.
- View historical logs, analytics, and trends across any device.
- **NEW:** Challenge or invite other users to competitive 1-vs-1 matches.

### 1.2 Why V2.2
- **Social Competition:** V2 established the foundation for individual tracking. V2.2 adds the ability to compete with friends, making practice more engaging and fun.
- **Physical Togetherness:** Designed for archers shooting together at the same range, each using their own phone to log scores privately until both submit.
- **Blind Scoring:** Scores remain hidden until both players submit, preventing psychological pressure during shooting.
- **Honor System:** After submission, both players can still edit their scores (maintaining the app's trust-based philosophy).

### 1.3 Goals
**G1 — Seamless Access:** Zero friction Google sign-in.  
**G2 — Rock-Solid Data:** Zero risk of accidental data loss from browser cache clearing.  
**G3 — Cross-Device:** Real-time sync across all user devices.  
**G4 — Social Competition:** Easy match setup, blind scoring, and clear winner determination.  
**G5 — Flexibility:** Configurable match parameters (distance, ends, arrows per end).

---

## 2. Release Scope

### 2.1 In Scope (V2.2)
- All V2 features (Authentication, Session Logging, Photos, Analytics)
- **1-vs-1 Match System:**
  - Challenge friends by email
  - Configurable match parameters (distance, ends, arrows per end)
  - Pre-created linked sessions for both players
  - Blind scoring (scores hidden until both submit)
  - Winner determination (total score, X-count tiebreaker)
  - Match history with win/loss display
  - Match cancellation (by challenger)

### 2.2 Deferred (V3+)
- Tournament support (multi-player matches)
- Advanced coaching features where an instructor can view a student's logs
- Match statistics (win rate, average score in matches vs practice)
- User blocking/moderation
- Real-time notifications (WebSockets)

---

## 3. Users, Roles, Permissions

### 3.1 Roles
- **User:** A standard archer who can log sessions, create matches, and accept challenges.
- **Challenger:** A user who creates a match invitation (has cancellation rights).
- **Opponent:** A user who receives and accepts a match invitation.
- **Admin:** (Optional internal role for Ceech to manage the system).

### 3.2 Row Level Security (RLS)
Supabase utilizes RLS (Row Level Security).
- Users can **only** Read, Insert, Update, and Delete rows where `user_id == auth.uid()`.
- **Exception:** In a match, players can view each other's sessions ONLY when both have submitted their scores.
- Photos in Supabase storage buckets are restricted to the user who uploaded them.
- *Strict data isolation by default, with controlled visibility for match opponents.*

---

## 4. Core Product Behavior

### 4.1 Session Model
- **Session:** One practice event on a specific date/time.
- **End:** A set of shots within a session (e.g., 5 arrows fired before retrieving). Can include an optional photo of the target (1 photo per end).
- **Shot:** An individual arrow's score.

### 4.2 Match Model
- **Match:** A competitive event between two archers with linked sessions.
- **Match Configuration:** Parameters set by challenger (distance, ends count, arrows per end).
- **Match Status Workflow:** `pending` → `accepted` → `active` → `completed` | `cancelled`
- **Linked Sessions:** Each player has their own session pre-created by the match system.
- **Submission:** Players tap "Submit Match Scores" after completing their session. Both must submit before scores are revealed.
- **Winner Determination:** Higher total score wins. Tie broken by X-count. True tie if X-count is equal.

### 4.3 Shots and Scoring Rules
- Score values must be integers **0-10** (or 'X' representing 10 with inner ring).
- `0` or 'M' means miss.
- Default shots per end is **5**, but editable per end from **1-12**.

### 4.4 Match Scoring Rules
- **Default Configuration:** 18 meters, 2 ends, 5 arrows per end.
- **Configurable:** Challenger can modify distance, ends count, and arrows per end before sending invitation.
- **Total Score:** Sum of all arrows across all ends.
- **X-Count:** Number of 'X' (inner 10) shots, used as tiebreaker.

### 4.5 Metrics Calculation
- **End total:** Sum of shots in that end.
- **Session total:** Sum of all end totals.
- **Averages:** Average per arrow, average per end.
- **Lifetime Stats:** Total arrows shot, lifetime average per arrow.

---

## 5. Database Architecture (Supabase PostgreSQL)

### 5.1 Existing Tables (Unchanged)

**`users`** (Managed by Supabase Auth)
- `id` (UUID, primary key)
- `email`
- `full_name`
- `avatar_url`

**`ends`**
- `id` (UUID, primary key)
- `session_id` (UUID, foreign key)
- `end_index` (Integer - order of the end)
- `photo_url` (Text, optional, points to Supabase Storage bucket)
- `created_at`

**`shots`**
- `id` (UUID, primary key)
- `end_id` (UUID, foreign key)
- `shot_index` (Integer)
- `score` (Integer)

### 5.2 Modified Tables

**`sessions`**
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `session_date` (Timestamp)
- `notes` (Text)
- `created_at`
- `updated_at`
- **`match_id` (UUID, foreign key → matches, nullable)** — NEW
- **`is_submitted_to_match` (Boolean, default false)** — NEW
- **`submitted_at` (Timestamp, nullable)** — NEW

### 5.3 New Tables

**`matches`**
- `id` (UUID, primary key)
- `config_distance` (Integer, default 18)
- `config_ends_count` (Integer, default 2)
- `config_arrows_per_end` (Integer, default 5)
- `challenger_user_id` (UUID, foreign key → auth.users)
- `opponent_user_id` (UUID, foreign key → auth.users, nullable until accepted)
- `challenger_session_id` (UUID, foreign key → sessions)
- `opponent_session_id` (UUID, foreign key → sessions)
- `status` (Text: 'pending' | 'accepted' | 'active' | 'completed' | 'cancelled')
- `challenger_total` (Integer, nullable, denormalized)
- `opponent_total` (Integer, nullable, denormalized)
- `challenger_x_count` (Integer, nullable, denormalized)
- `opponent_x_count` (Integer, nullable, denormalized)
- `winner_user_id` (UUID, foreign key → auth.users, nullable)
- `is_tie` (Boolean, default false)
- `cancelled_by_user_id` (UUID, foreign key → auth.users, nullable)
- `cancelled_reason` (Text, nullable)
- `invitation_expires_at` (Timestamp)
- `created_at` (Timestamp)
- `updated_at` (Timestamp)
- `accepted_at` (Timestamp, nullable)
- `completed_at` (Timestamp, nullable)
- `cancelled_at` (Timestamp, nullable)

**`match_invitations`**
- `id` (UUID, primary key)
- `match_id` (UUID, foreign key → matches)
- `invitee_email` (Text)
- `invitee_user_id` (UUID, foreign key → auth.users, nullable)
- `status` (Text: 'pending' | 'accepted' | 'expired' | 'declined')
- `invited_at` (Timestamp)
- `responded_at` (Timestamp, nullable)
- `expires_at` (Timestamp)

### 5.4 Indexes

**On `matches`:**
- `idx_matches_challenger` (challenger_user_id)
- `idx_matches_opponent` (opponent_user_id)
- `idx_matches_status` (status)
- `idx_matches_challenger_session` (challenger_session_id)
- `idx_matches_opponent_session` (opponent_session_id)

**On `match_invitations`:**
- `idx_invitations_email` (invitee_email)
- `idx_invitations_match` (match_id)
- `idx_invitations_user` (invitee_user_id)

**On `sessions`:**
- `idx_sessions_match` (match_id)
- `idx_sessions_submitted` (is_submitted_to_match)

### 5.5 Storage Buckets
- **`session_photos`**: A private bucket to store uploaded images of targets or form. RLS policies ensure only the authenticated user can upload/view their own photos.

### 5.6 Storage Cost Management (Free Tier Optimization)
- **Aggressive Client-Side Compression:** All photos must be compressed on the device *before* upload (e.g., using `browser-image-compression`). Target: max 800px width, 70% JPEG quality, resulting in ~100KB per image (allowing for ~10,000 photos in the free tier).
- **Auto-Deletion (TTL):** A Supabase Database Webhook or Edge Function will automatically delete any photo older than **30 days** (or 90 days, configurable). The textual session data remains forever, but the heavy image file is purged to continuously free up storage space.

---

## 6. Authentication and Security

### 6.1 Auth Flow
- App uses `@supabase/supabase-js`.
- User clicks "Sign in with Google".
- Supabase handles the OAuth handshake.
- No scary Google Drive scopes requested (only `email`, `profile`).
- Supabase returns a JWT session token to the client.

### 6.2 Security
- Never expose the Supabase `service_role` key to the frontend.
- Only expose the `anon` public key to the client frontend.
- Database access is strictly governed by Postgres Row Level Security (RLS) rules.

### 6.3 Row Level Security Policies for Matches

**`matches` table:**
- **SELECT:** Players can only see matches where they are challenger or opponent.
- **INSERT:** Only challenger can create (verified via `auth.uid()`).
- **UPDATE:** Only players in the match can update, with status-based restrictions.

**`match_invitations` table:**
- **SELECT:** Challenger (via match), invitee by email, or invited user.

**`sessions` table (modified):**
- **SELECT:** User's own sessions OR opponent's session when both are submitted to a match.

---

## 7. Match State Machine

```
┌─────────┐
│  NONE   │
└────┬────┘
     │ Create Match
     ▼
┌─────────┐     Accept Invitation      ┌─────────┐
│ PENDING │ ──────────────────────────→│ ACCEPTED│
└────┬────┘                            └────┬────┘
     │                                      │
     │ Decline                              │ Auto-create sessions
     ▼                                      ▼
┌─────────┐                            ┌─────────┐
│DECLINED │                            │ ACTIVE  │
└─────────┘                            └────┬────┘
     ▲                                      │
     │                                      │ Both submit scores
     │                                      ▼
     │                               ┌───────────┐
     │                               │  WAITING  │
     │                               │ (partial) │
     │                               └─────┬─────┘
     │                                     │
     │ Cancel (anytime)                    │ Other player submits
     │                                     ▼
     │                               ┌───────────┐
     └───────────────────────────────│ COMPLETED │
                                     └───────────┘
```

### 7.1 State Transitions

| From | To | Trigger | Who Can |
|------|-----|---------|---------|
| `pending` | `accepted` | Opponent accepts invitation | Opponent only |
| `pending` | `cancelled` | Challenger cancels | Challenger only |
| `pending` | `expired` | Invitation timeout (1 hour) | System |
| `accepted` | `active` | System creates sessions | System |
| `active` | `waiting` | One player submits scores | Either player |
| `waiting` | `completed` | Second player submits scores | Either player |
| `active` | `cancelled` | Challenger cancels | Challenger only |

---

## 8. API Design (Server Actions)

### 8.1 Match Management

```typescript
// Create a new match and send invitation
async function createMatch(input: {
  opponentEmail: string;
  config: {
    distance: number;
    endsCount: number;
    arrowsPerEnd: number;
  };
}): Promise<{ matchId: string; error?: string }>

// Accept an invitation (Player 2)
async function acceptInvitation(input: {
  invitationId: string;
}): Promise<{ matchId: string; error?: string }>

// Decline an invitation
async function declineInvitation(input: {
  invitationId: string;
}): Promise<{ error?: string }>

// Cancel a match (Player 1 only, before completion)
async function cancelMatch(input: {
  matchId: string;
  reason?: string;
}): Promise<{ error?: string }>
```

### 8.2 Match Scoring

```typescript
// Submit match scores (mark session as submitted)
async function submitMatchScores(input: {
  matchId: string;
}): Promise<{
  status: 'waiting' | 'completed';
  opponentSubmitted?: boolean;
  error?: string;
}>

// Get match details with opponent's visible scores
async function getMatchDetails(input: {
  matchId: string;
}): Promise<MatchDetails>
```

### 8.3 Match Queries

```typescript
// Get active match for current user (for dashboard banner)
async function getActiveMatch(): Promise<Match | null>

// List match history for user
async function listMatches(input: {
  status?: 'active' | 'completed' | 'cancelled' | 'all';
  limit?: number;
  offset?: number;
}): Promise<Match[]>

// Check if user has pending invitations
async function getPendingInvitations(): Promise<MatchInvitation[]>
```

---

## 9. User Experience

### 9.1 Dashboard

**Active Match Banner:**
- Shows when user has an accepted/active match
- Text: "🏹 Match in progress vs [Opponent Name] - Continue scoring"
- Click navigates to the match session logging screen
- Disappears after user submits their scores

**Challenge Button:**
- "Challenge Friend" button on dashboard
- Opens match creation modal

**Session History:**
- Match sessions display with indicator:
  - 🏆 "Match vs John - You Won!"
  - 😞 "Match vs Mike - You Lost"
  - 🤝 "Match vs Sarah - Tie"
- Regular practice sessions unchanged

### 9.2 Challenge Creation Flow

1. User taps "Challenge Friend"
2. Modal opens with:
   - Opponent Email input
   - Match Configuration:
     - Distance (default: 18m)
     - Number of Ends (default: 2)
     - Arrows per End (default: 5)
3. User taps "Send Challenge"
4. System creates match, pre-creates sessions, sends email
5. Dashboard shows "Waiting for opponent to accept..."

### 9.3 Invitation Acceptance Flow

1. Opponent receives email with link
2. Link opens app (or login if not authenticated)
3. After login, dashboard shows invitation banner:
   - "John invited you to a match: 18m, 2 ends, 5 arrows"
   - [Accept] [Decline] buttons
4. If accepted, status becomes 'active', sessions are linked
5. Dashboard shows active match banner

### 9.4 Match Session Logging

**During Active Match:**
- Session screen shows match header:
  - "Match vs [Opponent Name]"
  - "[Distance]m | [Ends] ends | [Arrows] arrows"
  - "You: [Your Score] | Opponent: --"
- User logs scores normally
- After last end, "Submit Match Scores" button appears
- User can still edit after submission (honor system)

**After Both Submit:**
- Session screen updates to show:
  - Both players' final scores
  - Winner announcement: "🏆 You Win!" or "😞 You Lost" or "🤝 Tie"
  - X-count comparison (if tie)

### 9.5 Match Result View

Side-by-side comparison:
```
┌─────────────────────────────────────┐
│  🏆 YOU WIN!                        │
│  Match vs John                      │
├─────────────────────────────────────┤
│                                     │
│         YOU          JOHN           │
│  Score  112          108            │
│  X's    3            2              │
│                                     │
│  [View Your Session]                │
│  [Rematch]                          │
└─────────────────────────────────────┘
```

---

## 10. Business Rules & Constraints

### 10.1 Match Constraints

| Constraint | Implementation |
|------------|----------------|
| One active match per user | Check before create/accept |
| Invitation expiration | 1 hour timeout |
| Only challenger can cancel | API + RLS enforcement |
| Blind scoring | RLS: opponent's session invisible until both submit |
| Config change after acceptance | Not allowed (lock after `accepted` status) |
| Score editing after submission | Allowed (honor system) |

### 10.2 Winner Determination

```
IF challenger_total > opponent_total:
    winner = challenger
ELSE IF opponent_total > challenger_total:
    winner = opponent
ELSE:
    // Tie - check X-count
    IF challenger_x_count > opponent_x_count:
        winner = challenger
    ELSE IF opponent_x_count > challenger_x_count:
        winner = opponent
    ELSE:
        // True tie
        is_tie = true
        winner = null
```

---

## 11. Email Notifications

### 11.1 Invitation Email

**Subject:** "[Challenger Name] challenged you to an archery match!"

**Body:**
```
Hi [Opponent Name],

[Challenger Name] has invited you to a 1-vs-1 archery match on ArrowLog!

Match Details:
• Distance: [X] meters
• Ends: [Y] ends
• Arrows per end: [Z] arrows

Accept the challenge: [Accept Link]

This invitation expires in 1 hour.

Good luck!
The ArrowLog Team
```

### 11.2 Email Provider
- Use Supabase built-in email service
- Template customizable via Supabase Dashboard

---

## 12. Non-functional Requirements

### 12.1 Offline Resilience (Client Cache)
- Current scorecard progress is constantly cached into `localStorage`
- Final "Save Session" button is disabled if no network connection
- "Submit Match Scores" requires network connection

### 12.2 Performance
- Match queries should return in < 200ms
- Session history should support pagination
- No polling required (refresh to see updates)

### 12.3 Mobile Experience (PWA)
- App provides `manifest.json` for "Add to Home Screen"
- Match notifications via email (no push notifications in V2.2)
- Optimized for phone use at the range

---

## 13. Future Considerations (V3+)

- **Tournaments:** Multi-player bracket-style competitions
- **Match Stats:** Win rate, average match score, best/worst match performance
- **Leaderboards:** Global or friend-group rankings
- **Rematch Button:** One-tap rematch with same opponent and config
- **Match Chat:** Simple messaging between players
- **Push Notifications:** Real-time match updates (when WebSockets implemented)

---

## 14. Implementation Phases

### Phase 1: Database & Schema
- Create `matches` and `match_invitations` tables
- Modify `sessions` table with match columns
- Set up RLS policies
- Create indexes

### Phase 2: Core API
- `createMatch` server action
- `acceptInvitation` / `declineInvitation` server actions
- `cancelMatch` server action
- `submitMatchScores` server action
- Match state transition logic

### Phase 3: Email Integration
- Supabase email template for invitation
- Accept/decline link handling route

### Phase 4: UI Components
- "Challenge Friend" button and modal
- Match banner on dashboard
- Match indicator in session history
- Match result view

### Phase 5: Edge Cases & Polish
- Expired invitation cleanup (Edge Function)
- Winner calculation logic
- Match cancellation flow
- Testing and bug fixes

---

**Document Version:** 2.2  
**Last Updated:** March 3, 2026  
**Status:** Ready for Implementation
