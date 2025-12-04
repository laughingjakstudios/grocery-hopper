import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { JoinListClient } from './JoinListClient'

interface JoinPageProps {
  params: Promise<{ code: string }>
}

export default async function JoinPage({ params }: JoinPageProps) {
  const { code } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If not logged in, redirect to signin with return URL
  if (!user) {
    redirect(`/auth/signin?returnTo=/join/${code}`)
  }

  // Try to find the list by share code
  const { data: list } = await supabase
    .from('grocery_lists')
    .select('id, name, description')
    .eq('share_code', code)
    .single()

  if (!list) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invalid Link</h1>
          <p className="text-gray-600 mb-6">
            This share link is invalid or has expired.
          </p>
          <a
            href="/dashboard"
            className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Go to Dashboard
          </a>
        </div>
      </div>
    )
  }

  // Check if user already has access
  const { data: existingShare } = await supabase
    .from('list_shares')
    .select('id, role')
    .eq('list_id', list.id)
    .eq('user_id', user.id)
    .single()

  if (existingShare) {
    // User already has access - redirect to dashboard
    redirect('/dashboard')
  }

  return (
    <JoinListClient
      listId={list.id}
      listName={list.name}
      listDescription={list.description}
      shareCode={code}
    />
  )
}
