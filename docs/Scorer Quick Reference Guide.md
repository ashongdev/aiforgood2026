# Scorer Quick Reference Guide
**AI for Good Robotics Competition — Scoring System**

---

## Table of Contents
1. [Spectator](#spectator)
2. [Scorekeeper](#scorekeeper)
3. [Referee](#referee)
4. [MC (Master of Ceremonies)](#mc-master-of-ceremonies)
5. [Admin](#admin)

---

## Spectator

**No login required.** Open the app URL in any browser on any device.

> [INSERT IMAGE: Full-width screenshot of the spectator home screen showing the standings leaderboard with team rows, phase arrows, and category toggle at the top]

### Standings (Qualifiers, Pre-Quarters, Quarters)

- The default view shows the **Standings leaderboard** for the current phase, listing all teams ranked by score.
- Each row shows the team's **country flag**, **team name**, and their score for each round played.
- Use the **← →** phase arrows at the top to navigate between Qualifiers, Pre-Quarterfinals, Quarterfinals, Semifinals, Third Place, and Finals.
- The current phase name is displayed prominently between the arrows.

#### Expanding a Team Row
- Tap any team row to expand it and reveal the full per-round score breakdown.
- The expanded row shows **Round 1, Round 2, Round 3, Round 4** scores individually alongside the cumulative total.
- Tap the row again to collapse it.

> [INSERT IMAGE: Screenshot of an expanded team row showing individual round scores R1–R4 and the Score Breakdown button]

#### Score Breakdown Modal
- Inside an expanded row, tap **Score Breakdown** to open the full mission-by-mission breakdown for that team.
- The modal shows every scoring action recorded by the referee for each round — seeds planted, fruits sorted, plots watered, penalties incurred, and the total per round.
- Tap the **✕** or tap outside the modal to close it.
- In bracket phases, you can view the team's complete scoring history across all rounds they have played.

> [INSERT IMAGE: Screenshot of the Score Breakdown modal showing mission rows with point values and round totals]

---

### Bracket View (Semifinals, Third Place, Finals)

- In elimination phases, the view switches from a leaderboard to a **bracket card layout**.
- Each card shows the two competing teams side by side with their scores and the match winner highlighted in **gold**.
- Tap anywhere on a match card to open the **detailed match view** showing full round-by-round scores for both teams.

> [INSERT IMAGE: Screenshot of the bracket card view showing two match cards side by side with team names, scores, and gold winner highlight]

#### Team Scoring History
- Below each match card, tap **📊 [Team Name]** to open that team's full scoring history across every round they have played in the competition.
- This is useful for comparing teams before a match or reviewing how a team has performed overall.

---

### Schedule

- Tap the **calendar icon** (bottom-right corner) to open the schedule view.
- The schedule lists all matches that have a confirmed start time, sorted chronologically from earliest to latest.
- Each row shows:
  - **Scheduled time** (date and time)
  - **Phase and category** (e.g. Qualifiers — Junior)
  - **Table number** where the match takes place
  - **Team 1 vs Team 2** with country flags
  - **Status chip** — Upcoming, Live, or Done
- Use the **search box** at the top to filter matches by team name — type any part of a team name to highlight matching rows.
- The **"Next Up"** banner at the top of the schedule highlights the closest upcoming match.

> [INSERT IMAGE: Screenshot of the schedule view showing a list of upcoming matches with time, table, teams, and status chips. The Next Up banner is visible at the top]

---

### Category Toggle

- Use the **Junior / Senior** toggle at the top of any view to switch between the two competition categories.
- All standings, brackets, and schedule data update immediately to reflect the selected category.
- Your category selection is remembered across page reloads.

---

### Locked Screens

- If the admin has locked scores for a phase, some or all data may be hidden from the spectator view.
- A **"Scores Hidden"** message is shown in place of scores when the admin has applied a score lock.
- A **"Results Hidden"** message is shown for a full lock where team names and brackets are also hidden.
- This is intentional — the admin locks results before announcing them publicly to prevent spoilers.

> [INSERT IMAGE: Screenshot of the locked scoreboard screen showing the "Results Hidden" message with the competition logo]

---

## Scorekeeper

**Requires login.** You will receive an email with your login credentials from the admin.

> [INSERT IMAGE: Screenshot of the Scorekeeper page showing the match grid with round score cells, phase and category dropdowns at the top, and a numpad open on one cell]

### Logging In
1. Open the app URL and tap **Sign In**.
2. Enter the email and password from your credentials email.
3. You will be redirected automatically to the Scorekeeper page.
4. If you have been assigned to a specific table, that table is pre-selected for you.

> [INSERT IMAGE: Screenshot of the login page showing the email and password fields with the eye toggle button visible]

---

### The Score Grid

- The main view is a **grid of matches** filtered to your assigned table and the current phase.
- Each row is one match. Columns show:
  - **Team 1** name and **Team 2** name
  - **R1, R2, R3, R4** — one score cell per round per team
  - **Total** — the sum of all rounds for each team, auto-calculated
- Score cells that are empty show a dash **—**. Cells with a score show the number.
- The **winner** of a match is highlighted in gold once both teams have scores.

> [INSERT IMAGE: Screenshot of the score grid showing several matches with some rounds scored, totals column, and a gold winner highlight on one row]

---

### Entering Scores

1. Tap any score cell to open the **numpad**.
2. The numpad shows the team name and round number at the top so you always know what you are entering.
3. Type the score using the digit buttons.
4. Use **⌫ (Backspace)** to correct a digit before confirming.
5. Tap **✓** to save the score. The cell updates immediately and the total recalculates.
6. Tap **✕** or tap outside the numpad to cancel without saving.

> [INSERT IMAGE: Screenshot of the numpad overlay open on a score cell, showing the team name and round label at the top, digit grid, backspace and confirm buttons]

---

### Correcting a Score

- Tap any already-scored cell to re-open the numpad with the current value pre-filled.
- Type the corrected score and tap **✓** to overwrite.
- All corrections are logged in the admin audit trail with the old and new values.

---

### Filters

- Use the **Phase**, **Category**, and **Table** dropdowns at the top to filter which matches are shown.
- Your assigned table is pre-selected by default — do not change the table filter unless instructed by the admin.
- Changing the **Phase** filter lets you view matches from other phases (read-only if that phase is locked).

---

### Winner Confirmation

- When scores are entered for both teams in a match, the system compares totals and highlights the higher-scoring team in **gold** as the winner.
- In bracket phases, the winner is recorded and carries forward to the next round automatically.
- If scores are equal, the match shows as a tie until the admin resolves it manually.

---

### Offline Mode

- If you lose internet connection, a **yellow offline banner** appears at the top of the page.
- You can continue entering scores while offline — they are queued locally.
- When your connection returns, queued scores are submitted automatically and the banner disappears.
- **Do not close the app or browser tab** while offline if you have pending scores — queued scores will be lost.

> [INSERT IMAGE: Screenshot showing the yellow offline banner at the top of the Scorekeeper page with a pending-sync indicator]

---

### Locked Phase

- If the admin locks a phase, a **red lock banner** appears at the top and score cells become read-only.
- You can still view scores but cannot enter or edit them.
- Contact the admin to unlock the phase if you need to make a correction.

---

## Referee

**Requires login.** You will receive an email with your login credentials from the admin.

The Referee interface is optimised for **phone use on the competition floor**. It is designed to be operated with one hand while watching the robots compete.

> [INSERT IMAGE: Screenshot of the Referee page on a mobile phone showing match cards with team names, round buttons (R1 R2 R3 R4), and a running total for each team]

### Logging In
1. Open the app URL on your phone and tap **Sign In**.
2. Enter the email and password from your credentials email.
3. You will be redirected automatically to the Referee page.

---

### Navigating Matches

- Use the **Phase**, **Category**, and **Table** dropdowns at the top to filter your matches.
- Your assigned table is pre-selected by default — you will normally only see matches at your table.
- Each **match card** on the page represents one head-to-head match.

#### Match Card Layout

Each card shows:
- **Team 1** name (top half of the card) with round buttons R1, R2, R3, R4 and a running total
- **Team 2** name (bottom half of the card) with the same buttons and total
- Round buttons are **grey** if that round has not been scored yet, and show the score in **gold** once recorded
- A **dividing line** separates the two teams within each card

> [INSERT IMAGE: Screenshot of a single match card showing both team names, R1–R4 buttons (some scored in gold, some grey), and the total for each team displayed prominently]

---

### Scoring a Round

1. On a match card, tap the **round button** (R1, R2, R3, R4) for the team you want to score.
2. The **scoring panel** slides up from the bottom of the screen.
3. The panel header shows the team name and which round you are scoring (e.g. "Team A — Round 2").

> [INSERT IMAGE: Screenshot of the scoring panel open from the bottom of the screen, showing the team name and round in the header, mission rows with + and − buttons, and the running total at the bottom]

4. Use the **+** and **−** buttons next to each scoring action to record what happened during the round:

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

5. Each tap of **+** increases the count for that action; each tap of **−** decreases it (minimum 0 for most actions).
6. The **Round Total** at the bottom of the panel updates live after every tap.
7. Tap **Save** to record the score. The total writes to the scoreboard immediately and is visible to spectators.
8. Tap the **✕** or tap outside the panel to cancel without saving.

> [INSERT IMAGE: Screenshot of the scoring panel with several actions already tapped (showing counts > 0) and the running total updating at the bottom]

---

### How Rounds Expand Automatically

- New round buttons (R2, R3, R4) appear automatically once the previous round has been scored for all matches — you do not need to tap any "+" button to add rounds.
- When a round is saved for any match, the page refreshes to show the new round buttons if applicable.

---

### Correcting a Score

- Tap the same round button again (it will show the score in gold) to re-open the scoring panel.
- The previous breakdown is pre-loaded — all counts are restored to what was saved.
- Adjust the counts as needed and tap **Save** to overwrite.
- Corrections are logged in the admin audit trail.

---

### Offline Mode

- If your phone loses signal, a yellow banner appears at the top.
- Scores entered while offline are queued and submitted automatically when the connection returns.
- Do not close the browser tab on your phone while offline with pending scores.

---

### Locked Phase

- If the admin locks a phase, round buttons become inactive and a red banner is shown.
- Contact the admin to unlock before entering any further scores.

---

## MC (Master of Ceremonies)

**Requires login.** You will receive an email with your login credentials from the admin.

The MC view is designed for the person calling teams to the competition floor. It shows all matchups across every phase — no scores, just the pairings and who to call next.

> [INSERT IMAGE: Screenshot of the MC page showing grouped match cards by phase, with team names, country flags, table numbers, scheduled times, and status chips (Upcoming / LIVE / Done)]

### Logging In
1. Open the app URL and tap **Sign In**.
2. Enter the email and password from your credentials email.
3. You will be redirected automatically to the MC view.

---

### The MC View

- Shows **all matches** from all phases (Qualifiers through Finals) in one scrollable list.
- Matches are **grouped by phase** with a phase header separating each group (e.g. "Qualifiers", "Semifinals").
- Each match card displays:
  - **Phase label** in the top-left corner
  - **Table number** — where the match takes place
  - **Scheduled time** — if set by the admin (shown as date and time)
  - **Team 1 vs Team 2** — team names with country flags
  - **Status chip** — Upcoming (grey), LIVE (pulsing gold), or Done (green)
- Completed matches show the **winning team highlighted in gold**.
- Scores are intentionally hidden from this view — the MC sees only team names and match status.

> [INSERT IMAGE: Close-up screenshot of two MC match cards side by side — one showing "Upcoming" status and one showing "Done" with a gold winner highlight]

---

### Live Banner

- When any match is actively in progress (score has been partially entered but not finalised), a **gold banner** appears at the top of the page:
  > **NOW ON COURT — Team A vs Team B (Table X)**
- Use this to confirm at a glance which teams are currently competing without scrolling.

> [INSERT IMAGE: Screenshot of the gold "NOW ON COURT" banner at the top of the MC page with team names and table number]

---

### Navigation & Filters

- **Category toggle** (All / Junior / Senior) at the top — tap to focus on one category or view both together.
- **Phase filter** dropdown — select a specific phase (e.g. Semifinals) to collapse all other phases and show only those matches.
- **Search box** — type any part of a team name to instantly filter the list. Matching cards remain visible; non-matching cards are hidden. Useful for quickly locating a team when they arrive at the venue.

> [INSERT IMAGE: Screenshot of the MC page with the search box active, showing a partial team name typed in and only matching match cards visible]

---

### Calling Teams

1. Use the **Phase filter** or scroll to find the next upcoming match (grey "Upcoming" chip).
2. Note the **Table number** shown on the card.
3. Call the two team names exactly as shown on the card.
4. Direct them to the listed table number.
5. Once the match is completed by the referee, the card's status chip changes to **Done** and the winning team is highlighted in gold — move on to the next upcoming card.

---

### Refreshing

- Tap the **refresh icon** (top right) to manually reload the latest match data.
- The page does not auto-refresh continuously — tap refresh before calling each match to ensure you have the latest status.

---

## Admin

**Requires login with an admin account.**

The Admin panel is the control centre for the entire competition. It is divided into four tabs, each managing a different aspect of the event.

> [INSERT IMAGE: Screenshot of the Admin panel showing the four tab headers (Qualifiers, Bracket, Teams, Staff) with the Teams tab active]

### Tabs Overview
| Tab | Purpose |
|---|---|
| **Qualifiers** | View qualifier scores, lock results, schedule match times, review the audit trail |
| **Bracket** | Manage the elimination bracket — seed teams, view results, lock bracket phases |
| **Teams** | Add, edit, and delete teams individually or via bulk CSV import |
| **Staff** | Add, manage, and import scorekeepers, referees, and MCs |

---

### Teams Tab

> [INSERT IMAGE: Screenshot of the Teams tab showing the team list with country flags, category badges, coach names, and action buttons, with the Add Team form visible at the top]

#### Adding a Single Team
1. Fill in the **Team Name** (required).
2. Select **Category** — Junior or Senior.
3. Enter the **Country** (used for the flag display).
4. Enter the **School / Coach** name (optional).
5. Optionally add a **Team Description** and **Team Members** (comma-separated).
6. Click **Add Team**. The team appears in the list immediately.

#### Editing a Team
- In the team list, click the **pencil icon** on any row to open the inline edit form for that team.
- Update any field and click **Save**.
- Changes are reflected immediately in the spectator view.

#### Deleting a Team
- Click the **trash icon** on a team row.
- A confirmation prompt appears — confirm to permanently delete the team.
- Deleting a team also removes them from any matches they are assigned to.

#### Bulk Importing Teams
1. Open the **Bulk Add Teams** collapsible panel.
2. Click **Choose File** to upload a `.csv` file, or paste CSV content directly.
3. Expected columns (in any order): `team_name`, `category`, `country`, `coach_name`.
4. A **preview table** appears showing all rows before import — you can edit individual cells in the preview.
5. Rows with errors (missing required fields) are highlighted in red.
6. Click **Import N Teams** to create all valid rows.
7. Each row shows a status after import: **✓ Added** or **✗ Error message**.

> [INSERT IMAGE: Screenshot of the Bulk Add Teams panel showing a preview table with several team rows, some with green checkmarks and one with a red error indicator]

---

### Staff Tab

> [INSERT IMAGE: Screenshot of the Staff tab showing the Add Staff form at the top and the staff list below with role badges (Referee / Scorekeeper / MC), table numbers, lock icons, and action buttons]

#### Adding a Single Staff Member
1. Enter their **email address**.
2. Select their **role**: Scorekeeper, Referee, or MC.
3. Assign a **table number** (optional — leave blank if the staff member covers all tables).
4. Click **Add Staff Member**.
5. The system automatically:
   - Creates a login account with a secure generated password
   - Sends a credentials email to the staff member (if email sending is configured)
   - Shows the generated password on screen so you can share it manually if needed

> [INSERT IMAGE: Screenshot of the Add Staff form with email, role dropdown, and table number field, alongside the success state showing the generated password with a copy button]

#### Bulk Importing Staff
1. Open the **Bulk Import Staff** collapsible panel.
2. Prepare a `.csv` file with these columns:

```
email,role,table_number
alice@example.com,referee,1
bob@example.com,scorekeeper,2
carol@example.com,scorekeeper,3
david@example.com,mc,
```

3. Upload the file. A **preview table** appears — you can edit role and table number for any row before importing.
4. Click **Import N Staff** to create all accounts.
5. Each row shows a live status: pending → **✓ Created** (with the generated password shown) or **✗ Error**.

> [INSERT IMAGE: Screenshot of the Bulk Import Staff panel mid-import, showing rows with green "Created" statuses, generated passwords in the password column, and one row still pending]

#### Searching and Filtering Staff
- Click the **magnifying glass icon** in the Staff list header to expand the search panel.
- Filter by **email** (type to search), **role** (All / Scorekeeper / Referee / MC), or **table number**.
- The list updates as you type. If no staff match the filters, a "No staff match your filters" message is shown.
- Click **Clear** to reset all filters. Click the magnifying glass again to collapse the search panel.

> [INSERT IMAGE: Screenshot of the staff search panel expanded below the list header, showing the email input, role dropdown, and table number input with the list filtered to show only Referees]

#### Managing Existing Staff

**Locking / Unlocking an Account**
- Click the **lock icon** on a staff row to lock that account. A locked account cannot log in.
- Locked accounts are highlighted in red in the list with a **Locked** badge.
- Click the lock icon again to unlock the account.
- Use this to temporarily suspend access without deleting the account.

**Editing Table Assignment**
- Click the **pencil icon** on a staff row to edit their assigned table number inline.
- Press **Enter** or click the **save button** to confirm. Press **Escape** to cancel.

**Revealing a Password**
- Click the **eye icon** on a staff row to expand the password panel for that staff member.
- The stored password (the last admin-generated password) is shown masked by default.
- Click the eye toggle within the panel to reveal or hide the actual password characters.
- Use this when a staff member has forgotten their password and you need to tell them what it is.

> [INSERT IMAGE: Screenshot of a staff row with the password panel expanded below it, showing masked dots, the reveal eye button, the copy button, and the reset button]

**Copying Credentials**
- In the password panel, click **Copy** to copy the staff member's email and password to the clipboard in one action.
- The button briefly shows **Copied!** to confirm.

**Resetting a Password**
- In the password panel, click **Reset** to generate a new password for that account.
- The new password is applied immediately, the stored password in the panel updates, and a credentials email is sent to the staff member automatically.
- The old password stops working as soon as Reset is clicked.

**Deleting a Staff Member**
- Click the **trash icon** on a staff row and confirm the prompt to permanently delete the account.
- This removes both their login access and their record from the staff list.

---

### Qualifiers Tab

> [INSERT IMAGE: Screenshot of the Qualifiers tab showing the match list grid with team names, round score columns, scheduled times, lock controls at the top, and the audit trail panel below]

#### The Match Grid
- Lists all qualifier matches for the selected category.
- Each row shows: **Team 1**, **Team 2**, scores for **R1–R4** (entered by scorekeepers), and the **total points** for each team.
- Scores entered by scorekeepers update live — refresh the page or watch for changes.

#### Score Locking
- **Lock Scores** — hides all numeric scores from the public spectator view. Team names and standings order remain visible.
- **Full Lock** — hides everything from spectators including team names and rankings. Use this immediately before announcing results.
- **Unlock** — restores the spectator view to normal.
- Locks are applied **per phase and per category** independently — locking Junior Qualifiers does not affect Senior Qualifiers.

#### Scheduling Match Times
- Click the **scheduled time field** on any match row (shows "—" if unset) to open a date-and-time picker.
- Set the time and click outside to save.
- Scheduled times appear on the public **Schedule** view immediately.
- Leave blank for matches without a fixed time slot.

#### Audit Trail
- Below the match grid, the **Score Audit Log** shows a full history of every score change made.
- Each entry shows: **date/time**, **staff member email**, **match details** (teams, phase, category), and a **change summary** (old value → new value for each round that changed).
- Use this to investigate disputed scores or confirm when a score was entered.

> [INSERT IMAGE: Screenshot of the audit trail panel showing several log entries with timestamps, scorer email addresses, team names, and before/after score values]

---

### Bracket Tab

> [INSERT IMAGE: Screenshot of the Bracket tab showing the seeding section at the top with team dropdowns, and the bracket visualization below with match cards for Semifinals and Finals]

#### Setting Up the Bracket
1. Once qualifier results are final and the advancing teams are decided, open the **Bracket tab**.
2. The seeding section at the top lets you assign teams to bracket slots by rank or manually.
3. Select the teams for each bracket position using the dropdowns.
4. Click **Save Bracket** to commit the seeding — match cards for the first bracket phase appear.

#### Viewing and Managing Bracket Matches
- Each bracket match card shows the two seeded teams and their current scores.
- As referees score rounds, scores update live on the bracket cards.
- When both teams have scores, the **winning team is highlighted** in gold automatically.

#### Advancing Winners
- Once a match has a winner, the winner's name populates automatically into the next match slot in the bracket.
- If a result needs to be corrected, update the scores via the Scorekeeper or Referee page — the bracket updates accordingly.

#### Score Locking in Bracket Phases
- Each bracket phase (Semifinals, Third Place, Finals) has its own **Lock / Unlock** controls.
- Lock a phase before announcing results to prevent spectators from seeing scores early.
- Locking one phase does not affect other phases.

---

### Required Database Migrations

If setting up for the first time, run these SQL scripts in the **Supabase SQL Editor** before use:

```sql
-- 1. Add referee + MC roles and scheduled_time column
ALTER TABLE public.user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE public.user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN ('admin', 'scorekeeper', 'referee', 'mc'));
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS scheduled_time timestamptz;

-- 2. Add score breakdown column for referee scoring
ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '{}';
```

---

*For technical issues, contact the system administrator.*
