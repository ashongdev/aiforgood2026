/** Must match defaultPasswordFor() in supabase/functions/manage-scorekeepers/index.ts */
export function defaultPasswordFor(role: string): string {
  return `${role}-aiforgood`;
}
