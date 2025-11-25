import { createBrowserClient } from '@supabase/ssr'

/**
 * Client-side Supabase client for browser use
 *
 * Use this in Client Components ('use client') that need to query data
 * This handles cookies properly and works with the middleware
 *
 * Usage:
 * ```typescript
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * const supabase = createClient()
 * const { data } = await supabase.from('table').select()
 * ```
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
