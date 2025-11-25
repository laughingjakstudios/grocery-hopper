import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { signOut } from '../auth/actions'
import { NewListDialog } from './components/NewListDialog'
import { ListCard } from './components/ListCard'
import { CategoriesButton } from './components/CategoriesButton'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/signin')
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

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
      {/* Header */}
      <header className="border-b bg-white">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">GroceryHopper</h1>
            <p className="text-sm text-gray-500">
              Welcome back, {profile?.full_name || user.email}
            </p>
          </div>
          <div className="flex gap-2">
            <CategoriesButton />
            <form action={signOut}>
              <Button variant="outline" type="submit">
                Sign Out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {/* Actions Bar */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Your Shopping Lists</h2>
            <p className="text-sm text-gray-500">
              {lists?.length || 0} {lists?.length === 1 ? 'list' : 'lists'}
            </p>
          </div>
          <NewListDialog />
        </div>

        {/* Lists Grid */}
        {!lists || lists.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No lists yet</CardTitle>
              <CardDescription>
                Create your first grocery list to get started!
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {lists.map((list) => (
              <ListCard
                key={list.id}
                list={list}
                categories={categories || []}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
