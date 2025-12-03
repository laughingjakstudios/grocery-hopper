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

  // Get grocery lists
  const { data: lists } = await supabase
    .from('grocery_lists')
    .select('*')
    .eq('user_id', user.id)
    .order('is_active', { ascending: false })
    .order('created_at', { ascending: false })

  // Get categories for dropdown
  const { data: categories } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

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
          initialLists={lists || []}
          initialCategories={categories || []}
          userId={user.id}
        />
      </main>

      {/* Floating Voice Input Button */}
      <VoiceInput />
    </div>
  )
}
