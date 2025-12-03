'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { requestPasswordReset } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, null)

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
          <CardDescription>
            Enter your email and we'll send you a reset link
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            {state?.error && (
              <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
                {state.error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? 'Sending...' : 'Send Reset Link'}
            </Button>

            <div className="text-center text-sm">
              <Link href="/auth/signin" className="text-blue-600 hover:underline">
                Back to sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
