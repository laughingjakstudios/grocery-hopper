import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { HamburgerMenu } from './components/HamburgerMenu'
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

  // Transform and sort lists
  type GroceryListData = {
    id: string
    name: string
    description: string | null
    is_active: boolean
    share_code: string | null
    user_id: string
    created_at: string
    updated_at: string
  }

  const lists = shares?.map(share => {
    // Supabase returns the joined data - extract it properly
    const listData = share.grocery_lists as unknown as GroceryListData
    return {
      ...listData,
      myRole: share.role as 'owner' | 'editor',
      isOwner: share.role === 'owner',
      isShared: share.role !== 'owner',
    }
  }).sort((a, b) => {
    // Active lists first, then by created_at
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  }) || []

  // Categories are now per-list, so we don't fetch them globally anymore
  // They'll be fetched per list in the components

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Minimal Header */}
      <header className="sticky top-0 z-30 border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">GroceryHopper</h1>
          <HamburgerMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        <DashboardContent
          initialLists={lists}
          userId={user.id}
        />
      </main>

      {/* Floating Voice Input Button */}
      <VoiceInput />
    </div>
  )
}
