#!/usr/bin/env node
/**
 * reset-matches.mjs
 *
 * Wipes all matches and phase locks from Supabase.
 * Teams are left untouched.
 *
 * Usage:
 *   SUPABASE_SERVICE_ROLE_KEY=<your-key> node scripts/reset-matches.mjs
 *
 * The service role key bypasses RLS. Find it in:
 *   Supabase Dashboard → Project Settings → API → service_role (secret)
 *
 * Never commit the service role key. Keep it out of .env files
 * that are checked into git.
 */

import { createClient } from "@supabase/supabase-js";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const SUPABASE_URL = "https://oxikkifudjbgnyzenwhn.supabase.co";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SERVICE_ROLE_KEY) {
  console.error(
    "\nMissing SUPABASE_SERVICE_ROLE_KEY.\n" +
    "Run as:\n" +
    "  SUPABASE_SERVICE_ROLE_KEY=<your-key> node scripts/reset-matches.mjs\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function confirm(question) {
  const rl = readline.createInterface({ input, output });
  const answer = await rl.question(question);
  rl.close();
  return answer.trim().toLowerCase();
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`Count failed on ${table}: ${error.message}`);
  return count ?? 0;
}

async function main() {
  console.log("\n⚠️  AI for Good — Database Reset");
  console.log("   This will permanently delete ALL matches and phase locks.");
  console.log("   Teams will NOT be affected.\n");

  // Show current counts
  const [matchCount, lockCount, teamCount] = await Promise.all([
    countRows("matches"),
    countRows("phase_locks"),
    countRows("teams"),
  ]);

  console.log(`   Current state:`);
  console.log(`     matches:      ${matchCount} rows  → will be deleted`);
  console.log(`     phase_locks:  ${lockCount} rows  → will be deleted`);
  console.log(`     teams:        ${teamCount} rows  → preserved\n`);

  const answer = await confirm('   Type "reset" to confirm, anything else to cancel: ');

  if (answer !== "reset") {
    console.log("\n   Cancelled. Nothing was changed.\n");
    process.exit(0);
  }

  console.log("\n   Resetting…");

  // Delete phase locks first (no FK dependency, but keeps it clean)
  const { error: lockErr } = await supabase
    .from("phase_locks")
    .delete()
    .neq("phase", "__impossible__"); // delete-all workaround (RLS requires a filter)

  if (lockErr) {
    console.error(`\n   ❌ Failed to delete phase_locks: ${lockErr.message}`);
    process.exit(1);
  }

  // Delete all matches
  const { error: matchErr } = await supabase
    .from("matches")
    .delete()
    .neq("id", "00000000-0000-0000-0000-000000000000"); // delete-all workaround

  if (matchErr) {
    console.error(`\n   ❌ Failed to delete matches: ${matchErr.message}`);
    process.exit(1);
  }

  // Verify
  const [newMatchCount, newLockCount] = await Promise.all([
    countRows("matches"),
    countRows("phase_locks"),
  ]);

  console.log("\n   ✅ Reset complete.");
  console.log(`     matches:     ${newMatchCount} rows remaining`);
  console.log(`     phase_locks: ${newLockCount} rows remaining`);
  console.log(`     teams:       ${teamCount} rows (unchanged)\n`);
}

main().catch((err) => {
  console.error("\n   Unexpected error:", err.message);
  process.exit(1);
});
