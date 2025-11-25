import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If user is signed in, redirect to dashboard
  if (user) {
    redirect('/dashboard')
  }

  // Otherwise show landing page
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="text-center">
        <h1 className="mb-4 text-6xl font-bold text-gray-900">
          GroceryHopper
        </h1>
        <p className="mb-8 text-xl text-gray-600">
          Your simple, smart grocery list manager
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/auth/signup">
            <Button size="lg">Get Started</Button>
          </Link>
          <Link href="/auth/signin">
            <Button variant="outline" size="lg">
              Sign In
            </Button>
          </Link>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3 text-left max-w-3xl mx-auto">
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-2 font-semibold">Create Lists</h3>
            <p className="text-sm text-gray-600">
              Organize multiple grocery lists for different stores or occasions
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-2 font-semibold">Categorize Items</h3>
            <p className="text-sm text-gray-600">
              Add custom categories with colors and icons to organize your shopping
            </p>
          </div>
          <div className="rounded-lg border bg-white p-6">
            <h3 className="mb-2 font-semibold">Check Off Items</h3>
            <p className="text-sm text-gray-600">
              Mark items as you shop and clear them when you're done
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
