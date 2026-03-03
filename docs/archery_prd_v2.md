# Product Requirements Document (PRD)
## Archery Log Web App — V2 (Supabase Edition)

**Owner:** Ceech  
**Primary users:** Archers tracking practice sessions, scores, and visualizing progress over time.
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
- **UPDATED (V2.2):** Challenge or invite other users to competitive 1-vs-1 matches. See `archery_prd_v2-2.md` for the complete match feature specification.

### 1.2 Why the V2 Pivot
- **Frictionless Onboarding:** V1 relied on Google Sheets/Drive scopes, which triggered Google's heavy security warnings ("unverified app"). V2 uses standard Google OAuth (Profile/Email only) which is frictionless.
- **Data Reliability:** Pure local storage risks catastrophic data loss if a user clears their browser cache. Supabase guarantees data is safely synced and backed up in the cloud.
- **Cross-Device Sync:** Users expect to log a session on their phone at the range, and analyze it on their laptop at home. A unified database makes this possible.
- **Social Features (Future-proofing):** To support user-to-user invites and challenges, a centralized and capable relational database (PostgreSQL) is strictly required.

### 1.3 Goals
**G1 — Seamless Access:** Zero friction Google sign-in.  
**G2 — Rock-Solid Data:** Zero risk of accidental data loss from browser cache clearing.  
**G3 — Cross-Device:** Real-time sync across all user devices.  
**G4 — Extensibility:** Foundation laid for social/multiplayer features (challenges).  

**UPDATE (March 2026):** The 1-vs-1 match feature previously listed as "Future" has been designed and is ready for implementation. See `archery_prd_v2-2.md`.

---

## 2. Release Scope

### 2.1 In Scope (V2)
- Google Authentication (via Supabase Auth - basic profile scope).
- Automated provisioning of user records in the database.
- Session logging (Date, Notes, Ends, Shots).
- Photo uploads for sessions (stored safely in Supabase Storage).
- Real-time calculations of scores, totals, and averages.
- Dashboard with history calendar and personal analytics.

### 2.2 Deferred (V3+)
- **~~Social/Challenges~~** — MOVED TO V2.2: See `archery_prd_v2-2.md` for the 1-vs-1 Match feature specification.
- Tournament support (multi-player matches)
- Advanced coaching features where an instructor can view a student's logs.

---

## 3. Users, Roles, Permissions

### 3.1 Roles
- **User:** A standard archer.
- **Admin:** (Optional internal role for Ceech to manage the system).

### 3.2 Row Level Security (RLS)
Supabase utilizes RLS (Row Level Security).
- Users can **only** Read, Insert, Update, and Delete rows where `user_id == auth.uid()`.
- Photos in Supabase storage buckets are restricted to the user who uploaded them.
- *Strict data isolation by default.*

---

## 4. Core Product Behavior

### 4.1 Session Model
- **Session:** One practice event on a specific date/time.
- **End:** A set of shots within a session (e.g., 5 arrows fired before retrieving). Can include an optional photo of the target (1 photo per end).
- **Shot:** An individual arrow's score.

### 4.2 Shots and Scoring Rules
- Score values must be integers **0-10** (or 'X' representing 10 with inner ring).
- `0` or 'M' means miss.
- Default shots per end is **5**, but editable per end from **1-12**.

### 4.3 Metrics Calculation
- **End total:** Sum of shots in that end.
- **Session total:** Sum of all end totals.
- **Averages:** Average per arrow, average per end.
- **Lifetime Stats:** Total arrows shot, lifetime average per arrow.

---

## 5. Database Architecture (Supabase PostgreSQL)

### 5.1 Tables

**`users`** (Managed mostly by Supabase Auth, but extended if needed)
- `id` (UUID, primary key)
- `email`
- `full_name`
- `avatar_url`

**`sessions`**
- `id` (UUID, primary key)
- `user_id` (UUID, foreign key)
- `session_date` (Timestamp)
- `notes` (Text)
- `created_at`
- `updated_at`

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

### 5.2 Storage Buckets
- **`session_photos`**: A private bucket to store uploaded images of targets or form. RLS policies ensure only the authenticated user can upload/view their own photos.

### 5.3 Storage Cost Management (Free Tier Optimization)
To ensure the app never exceeds the Supabase Free Tier (1GB Storage, 2GB Bandwidth limit):
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

---

## 7. User Experience

### 7.1 Primary Screen (Logging)
- "Start Session" button.
- Clean digital scorecard UI.
- Inline photo upload button that triggers the device's native camera or gallery picker.
- Instant total/average calculations as scores are tapped in.

### 7.2 Secondary Screen (History/Dashboard)
- Calendar view highlighting days with logged sessions.
- List view of recent sessions with thumbnail of the target photo (if uploaded).
- Analytics graphs showing progression of "Average Score per Arrow" over time.

---

## 8. Non-functional Requirements

### 8.1 Offline Resilience (Client Cache)
- The app will use elite, defensive UX: Current scorecard progress is constantly cached into `localStorage` so if the browser tab crashes, progress is restored.
- To prevent complex background-queue syncing issues, the final "Save Session" button is disabled if the user has no network connection (`navigator.onLine == false`) with a clear "Waiting for connection to save..." message.

### 8.2 Performance
- Fast queries. The UI should feel instant.

### 8.3 Mobile Experience (PWA)
- Ensure the app provides a `manifest.json` and basic service worker so users can "Add to Home Screen" on iOS/Android, giving it a native app feel and removing the browser URL bar.
