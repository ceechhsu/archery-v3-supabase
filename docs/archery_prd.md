# Product Requirements Document (PRD)
## Archery Log Web App — Personal, DB-less Edition

**Owner:** Ceech  
**Primary users:** Anyone who wants to track archery practice  
**Platforms:** Web (responsive) — iPhone Safari, Android Chrome, Desktop browsers  
**Time zone:** User local time for all date/time logic  
**Storage model:** User-owned Google Sheet + optional local cache (no app-managed database)

---

## 1. Overview

### 1.1 Purpose
Build a web app that allows any archer to:
- Sign in with Google.
- Log practice sessions and shot details at any time.
- View historical logs and trends.
- Keep data in their own Google Drive spreadsheet instead of a centralized app DB.

### 1.2 Why this shift
- Remove class-only constraints and make the app useful to everyone.
- Avoid centralized DB costs and scaling concerns on hosted free tiers.
- Improve user trust and portability by letting users own their data directly.

### 1.3 Goals
**G1 — Universal use:** Any user can use the app anytime, not only during class windows.  
**G2 — Zero app DB:** Core functionality works without app-managed backend storage.  
**G3 — Data ownership:** Users can inspect and export data in their own Google Sheet.

### 1.4 Non-goals (for this release)
- No instructor approval queue.
- No shared class roster or cross-user visibility.
- No instructor-side editing of student logs.
- No tournament mode.

---

## 2. Release Scope

### 2.1 In Scope (V1)
- Google authentication.
- Per-user Google Sheet storage setup (create/connect).
- Session logging with ends/shots.
- Scores, totals, averages, and history calendar.
- Edit/delete of user-owned records.
- Basic trend/summary analytics per user.
- Import/export resilience (rebuild state from Sheet).

### 2.2 Deferred (V2+)
- Optional sharing modes (coach/student or class group).
- Optional cloud sync providers beyond Google Sheets.
- Optional paid multi-user admin workspace.

---

## 3. Users, Roles, Permissions

### 3.1 Roles
- **User (single role in V1).**

### 3.2 Permissions
- Sign in/out with Google.
- Create/read/update/delete only their own data.
- Connect, create, and use their own Google Sheet file.
- Delete account/session from app context.

---

## 4. Core Product Behavior

### 4.1 Access and Availability
- Logging is available **24/7**.
- No class-hour restriction.
- No enrollment gate.

### 4.2 Session Model
- **Session:** one practice event on a date/time.
- **End:** one set of shots in a session.
- **Shot:** one integer score.

### 4.3 Shots and Scoring Rules
- Score values must be integers **0-10**.
- No half points.
- `0` means miss / no score.
- Shots per end default to **5**, editable per end from **1-12**.

### 4.4 Metrics
Per End:
- End total = sum of shot scores.

Per Session:
- Total points = sum of end totals.
- Total arrows = number of shots in session.
- Avg per arrow = total points / total arrows.
- Avg per end = mean of end totals.

Lifetime (user):
- Lifetime avg per arrow.
- Lifetime avg per end.
- Sessions count and arrows count.

### 4.5 Editing
- Users can edit/delete their own sessions at any time (V1 default).

---

## 5. Data Storage Architecture (No Central DB)

### 5.1 Source of Truth
- User-owned Google Sheet is the canonical data source.

### 5.2 Local Cache
- App may keep a local browser cache for responsiveness.
- Cache must be reconstructible from Sheet data.
- On conflicts, Sheet is authoritative unless user explicitly chooses local overwrite.

### 5.3 Google Sheet Provisioning
On first run:
1. User signs in with Google.
2. App requests required scopes.
3. App finds existing Archery log sheet by app metadata or naming convention.
4. If none found, app creates one and initializes required tabs/headers.

### 5.4 Required Sheet Tabs
- `sessions`
- `ends`
- `shots`
- `meta`

### 5.5 Suggested Columns
`sessions`:
- `session_id` (UUID)
- `session_date` (YYYY-MM-DD)
- `created_at`
- `updated_at`
- `notes` (optional)

`ends`:
- `end_id` (UUID)
- `session_id`
- `end_index`
- `shots_count`
- `end_total`

`shots`:
- `shot_id` (UUID)
- `end_id`
- `shot_index`
- `score`

`meta`:
- `key`
- `value`

---

## 6. Authentication and OAuth

### 6.1 Auth Provider
- Google OAuth only for V1.

### 6.2 Scopes
Minimum required Google scopes for Sheets integration:
- Sign-in identity scopes.
- Spreadsheet read/write scope.

If Drive file creation/discovery is used:
- Add least-privilege Drive scope needed for app-created file access.

### 6.3 Failure Handling
- If OAuth scope consent is denied, app explains required permissions and offers retry.
- If token expires, app prompts re-auth and resumes sync.

---

## 7. User Experience

### 7.1 Primary Screen
- Today session editor (or quick new-session editor) with:
  - Add end
  - Shot inputs
  - Inline totals
  - Save/sync status

### 7.2 Secondary Screen
- Calendar/history with session drill-down.

### 7.3 Analytics Screen
- Personal summary cards and simple trends over time.

### 7.4 Account/Storage Screen
- Connected Google account.
- Linked spreadsheet ID/title.
- Last sync timestamp.
- Actions:
  - Re-sync from Sheet
  - Export current view
  - Disconnect app

---

## 8. Sync and Reliability Requirements

### 8.1 Sync Modes
- **Auto-sync on save** for session edits.
- **Manual sync** button available in settings.

### 8.2 Offline/Network Degradation
- If network fails, queue pending writes locally.
- Show clear status: `Not synced`, `Syncing`, `Synced`, `Sync failed`.
- Retry policy: exponential backoff + user-initiated retry.

### 8.3 Idempotency
- Writes should use stable IDs so retries do not duplicate records.

### 8.4 Data Recovery
- If local cache is cleared, full state can be restored by reading the Sheet.

---

## 9. Privacy and Security

### 9.1 Privacy Defaults
- No cross-user data visibility in V1.
- App does not maintain centralized user practice logs.

### 9.2 Secrets
- No sensitive keys hardcoded in client beyond public OAuth client config and allowed public keys.
- Keep privileged secrets out of frontend code.

### 9.3 Principle of Least Privilege
- Request minimum Google scopes necessary.

---

## 10. Non-functional Requirements

### 10.1 Performance
- Initial app shell render target: < 2 seconds perceived on mobile.
- Typical save interaction target: visible UI response within 500 ms and async sync indicator thereafter.

### 10.2 Compatibility
- iPhone Safari, Android Chrome, modern desktop browsers.

### 10.3 Accessibility
- Keyboard navigable inputs/actions.
- Visible focus states.
- Semantic labels and readable color contrast.

---

## 11. Acceptance Criteria

### 11.1 Auth + Sheet Setup
- User can sign in with Google.
- App can create or connect to a user-owned spreadsheet.
- Required sheet tabs/headers are initialized if missing.

### 11.2 Logging
- User can create session entries at any time.
- User can add ends with 1-12 shots.
- Only integer 0-10 scores accepted.
- Totals/averages calculate correctly.

### 11.3 History + Analytics
- Calendar shows dates with saved sessions.
- User can open past sessions and edit/delete them.
- Personal aggregate stats render correctly from stored data.

### 11.4 Sync + Reliability
- Save operations write to Google Sheet.
- Failed writes surface actionable error states.
- Retry can recover from transient network errors.
- Reloading app reconstructs from Sheet accurately.

### 11.5 Privacy
- User cannot access any other user's logs through the app.

---

## 12. Migration Notes from Previous PRD

- Remove class-time lock (9:00am-2:00pm rule).
- Remove enrollment approval workflow.
- Remove student/admin split for V1.
- Remove class logs and instructor edit markers.
- Keep scoring model and session/end/shot structure with personal analytics.

---

## 13. Risks and Mitigations

### Risk: Google API quota/rate limits per user
Mitigation:
- Batch writes where possible.
- Cache reads and avoid unnecessary full-sheet scans.

### Risk: Sheet schema drift (user manually edits columns)
Mitigation:
- Validate headers on startup.
- Offer one-click schema repair.

### Risk: Sync conflicts across multiple devices
Mitigation:
- Stable record IDs + `updated_at` conflict strategy.
- Show conflict prompts for destructive merges.

---

## 14. Future Path (Optional)

- Add optional “shared class mode” as a paid/managed backend feature later.
- Keep personal mode always available and DB-less for broad adoption.
