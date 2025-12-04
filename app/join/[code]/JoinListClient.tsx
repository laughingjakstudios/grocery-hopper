'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, ShoppingCart } from 'lucide-react'
import { joinListByCode } from '@/app/dashboard/actions'

interface JoinListClientProps {
  listId: string
  listName: string
  listDescription: string | null
  shareCode: string
}

export function JoinListClient({ listId, listName, listDescription, shareCode }: JoinListClientProps) {
  const router = useRouter()
  const [joining, setJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleJoin() {
    setJoining(true)
    setError(null)

    const result = await joinListByCode(shareCode)

    if (result.error) {
      setError(result.error)
      setJoining(false)
      return
    }

    // Success - redirect to dashboard
    router.push('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
            <ShoppingCart className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl">Join Shared List</CardTitle>
          <CardDescription>
            You've been invited to collaborate on a grocery list
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* List Info */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-semibold text-gray-900">{listName}</h3>
            {listDescription && (
              <p className="mt-1 text-sm text-gray-600">{listDescription}</p>
            )}
          </div>

          {/* What you can do */}
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">As an editor, you can:</p>
            <ul className="space-y-1 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Add and remove items
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Check off items as you shop
              </li>
              <li className="flex items-center gap-2">
                <span className="text-green-500">✓</span>
                Add and edit categories
              </li>
            </ul>
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={handleJoin}
              disabled={joining}
              className="w-full"
            >
              <Users className="mr-2 h-4 w-4" />
              {joining ? 'Joining...' : 'Join List'}
            </Button>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard')}
              disabled={joining}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
