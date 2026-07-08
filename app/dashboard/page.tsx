import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { transformShares } from '@/lib/list-state'
import { VoiceInput } from './components/VoiceInput'
import { DashboardContent } from './components/DashboardContent'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get all lists the user has access to (owned + shared)
  const { data: shares } = await supabase
    .from('list_shares')
    .select(`
      role,
      grocery_lists!inner (
        id,
        name,
        description,
        is_active,
        share_code,
        user_id,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)

  const lists = transformShares(shares)

  return (
    <div className="min-h-screen bg-background">
      <DashboardContent
        initialLists={lists}
        userId={user.id}
      />

      {/* Floating Voice Input Button */}
      <VoiceInput />
    </div>
  )
}
