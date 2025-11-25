import { createClient } from '@supabase/supabase-js'

/**
 * Service role client for admin operations that bypass RLS
 *
 * CRITICAL SECURITY NOTES:
 * - This client has FULL database access (bypasses RLS)
 * - ONLY use this for:
 *   1. Creating user profiles during signup (before they have a session)
 *   2. Background jobs that need admin access
 *   3. System-level operations
 * - NEVER expose this client to the browser!
 * - NEVER use user input directly in queries with this client!
 * - ALWAYS use server-side only (in API routes or Server Actions)
 *
 * Usage example (in app/auth/actions.ts):
 * ```typescript
 * const adminClient = createServiceRoleClient()
 * await adminClient.from('profiles').insert({ id: user.id, email: user.email })
 * ```
 *
 * Why we need this:
 * - During signup with email confirmation, user has no session yet
 * - Regular client can't insert into profiles (RLS blocks it)
 * - Service role client bypasses RLS to create the profile
 * - Once user confirms email and signs in, they can use regular client
 */
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase service role environment variables. ' +
      'Get SUPABASE_SERVICE_ROLE_KEY from: Supabase Dashboard > Settings > API > service_role key'
    )
  }

  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
