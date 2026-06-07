import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is not set. ' +
    'Add them to your .env file before using scorekeeper or admin features.'
  )
}

// We use our own types (database.types.ts) for all query responses and
// do not pass the Database generic here — our minimal type shape lacks the
// full Supabase GenericSchema (Views, Functions, Enums, etc.) that the
// client generic requires to avoid inferring 'never' on mutations.
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
