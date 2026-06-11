# Scorer Quick Reference Guide
**AI for Good Robotics Competition — Scoring System**

---

## Table of Contents
1. [Spectator](#spectator)
2. [Scorekeeper](#scorekeeper)
3. [Referee](#referee)
4. [Admin](#admin)

---

## Spectator

**No login required.** Open the app URL in any browser.

### Viewing Standings
- The default view shows the **Standings** for the current phase.
- Use the **← →** phase arrows at the top to navigate between Qualifiers, Pre-Quarters, Quarters, and bracket rounds.
- Tap any team row to expand it and see their individual Round 1–4 scores.
- Tap **Score Breakdown** inside the expanded row to see a mission-by-mission breakdown of how that team earned their points.

### Bracket Phases (Semis / Finals)
- The bracket shows each head-to-head matchup card with both teams side by side.
- Tap anywhere on the card to open the detailed match view.
- Below each card, tap **📊 [Team Name]** to open that team's full scoring history across all rounds.

### Schedule
- Tap the **calendar icon** (bottom-right corner) to open the schedule view.
- Shows all matches with confirmed start times, sorted chronologically.
- Use the search box to filter by team name.
- Status chips show: **Upcoming**, **Live**, or **Done**.

### Category
- Toggle between **Junior** and **Senior** using the category selector at the top.

---

## Scorekeeper

**Requires login.** You will receive an email with your login credentials from the admin.

### Logging In
1. Open the app URL and tap **Sign In**.
2. Enter the email and password from your credentials email.
3. You will be redirected automatically to the Scorekeeper page.

### Entering Scores
- The page shows a grid of all matches for your assigned table and selected phase.
- Tap any score cell to open the numpad.
- Type the score using the numpad, then tap **✓** to confirm.
- The score saves immediately and updates live for spectators.

### Filters
- Use the **Phase**, **Category**, and **Table** dropdowns at the top to filter matches.
- Your assigned table is pre-selected by default.

### Offline Mode
- If you lose internet connection, a yellow banner appears at the top.
- Scores you enter while offline are queued and submitted automatically when the connection returns.
- Do not close the app while offline if you have pending scores.

### Locked Phase
- If the admin locks a phase, you will see a red banner and cannot enter new scores.
- Contact the admin to unlock the phase.

---

## Referee

**Requires login.** You will receive an email with your login credentials from the admin.

### Logging In
1. Open the app URL on your phone and tap **Sign In**.
2. Enter the email and password from your credentials email.
3. You will be redirected automatically to the Referee page.

### Navigating Matches
- Use the **Phase**, **Category**, and **Table** dropdowns to filter your matches.
- Your assigned table is selected by default.
- Each match card shows both teams and round buttons.

### Scoring a Round
1. On a match card, tap the **round button** (R1, R2, R3, R4) for the team you want to score.
2. The scoring panel slides up from the bottom.
3. Use the **+** and **−** buttons to record each scoring action:

| Mission 1 — Cultivation & Irrigation | |
|---|---|
| Seeds in correct zone | +10 pts (Junior) / +5 pts (Senior) |
| Seeds in subdivision | 0 pts (Junior) / +10 pts (Senior) |
| Seeds misplaced | 0 pts (Junior) / −5 pts (Senior) |
| Plots watered | +30 pts |
| Empty plots watered | 0 pts (Junior) / −10 pts (Senior) |

| Mission 2 — Harvesting & Sorting | |
|---|---|
| Fruits moved off field | +5 pts |
| Red fruits in correct bin | +5 pts |
| Red fruits in waste bin | 0 pts (Junior) / −5 pts (Senior) |
| Black fruits in waste bin | +10 pts |
| Black fruits in fruit bin | 0 pts (Junior) / −10 pts (Senior) |
| Green fruits moved | 0 pts (Junior) / −5 pts (Senior) |

| Penalties | |
|---|---|
| Unauthorized assistance | −20 pts |
| Deliberate field manipulation | −20 pts |
| Seeds outside field | −20 pts |
| Robot exits field | −20 pts |

4. The **Round Total** updates automatically as you tap.
5. Tap **Save** to record the score. The total writes to the scoreboard immediately.
6. Tap outside the panel or the **✕** to cancel without saving.

### Correcting a Score
- Tap the same round button again to re-open the panel.
- The previous breakdown is pre-loaded. Adjust as needed and tap **Save**.

### Offline Mode
- Same as Scorekeeper — scores queue offline and sync when reconnected.

---

## Admin

**Requires login with an admin account.**

### Tabs Overview
| Tab | Purpose |
|---|---|
| **Qualifiers** | View and manage qualifier match scores and scheduling |
| **Bracket** | Manage elimination bracket, assign seeds, set winners |
| **Teams** | Add teams individually or bulk-import from CSV |
| **Staff** | Add/manage scorekeepers and referees, bulk-import staff |

---

### Teams Tab

#### Adding a Single Team
1. Fill in Team Name, Category (Junior/Senior), Country, Coach, and optional description/members.
2. Click **Add Team**.

#### Bulk Importing Teams
1. Open the **Bulk Add Teams** panel.
2. Paste or upload a CSV. Columns: `team_name`, `category`, `country`, `coach_name`.
3. Edit rows in the preview table if needed.
4. Click **Import N Teams**.

---

### Staff Tab

#### Adding a Single Staff Member
1. Enter their **email address**.
2. Select their **role**: Scorekeeper or Referee.
3. Assign a **table number** (optional — referees and scorekeepers default to "all tables" if not set).
4. Click **Add Staff Member**.
5. The system creates their account and sends a credentials email automatically.

#### Bulk Importing Staff
1. Open the **Bulk Import Staff** panel.
2. Prepare a CSV with these columns:

```
email,role,table_number
alice@example.com,referee,1
bob@example.com,scorekeeper,2
carol@example.com,scorekeeper,3
```

3. Upload the file. A preview table appears.
4. Click **Import N Staff** to create all accounts.
5. Each row shows a status: ✓ Created or ✗ Error.
6. Created staff receive a credentials email with their login details.

#### Managing Existing Staff
- The staff list shows all scorekeepers and referees with their role badge and table number.
- Accounts can be locked/unlocked to temporarily suspend access.

---

### Qualifiers Tab

#### Score Locking
- **Lock Scores** — hides all scores from the public spectator view. Team names remain visible.
- **Full Lock** — hides everything from spectators (scores + bracket).
- Use this before announcing results to prevent spoilers.

#### Scheduling Match Times
- Click the scheduled time field on any match row to set a date and time.
- Times appear on the public **Schedule** view once set.

---

### Bracket Tab

#### Setting Up the Bracket
1. Once qualifier results are final, use the Bracket tab to seed teams into the elimination bracket.
2. Assign match winners manually or they are set automatically when a score is entered.

#### Score Locking
- Same lock controls as Qualifiers, scoped to each bracket phase independently.

---

### Required Database Migrations

If setting up for the first time, run these SQL scripts in the **Supabase SQL Editor** before use:

```sql
-- 1. Add referee role and scheduled_time column
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'scorekeeper', 'referee'));
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS scheduled_time timestamptz;

-- 2. Add score breakdown column for referee scoring
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}';
```

---

*For technical issues, contact the system administrator.*
