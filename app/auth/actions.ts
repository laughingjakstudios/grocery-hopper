'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

/**
 * Sign up a new user with proper profile creation
 *
 * This is the CORRECT pattern for Supabase + Next.js:
 * 1. Create user in auth.users via auth.signUp()
 * 2. Immediately create profile using service role client
 * 3. Service role bypasses RLS (user has no session during email confirmation)
 *
 * Why not use database triggers:
 * - Unreliable in hosted Supabase
 * - Hard to debug when they fail
 * - This approach is explicit and testable
 */
export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string

  const data = {
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    console.error('Signup error:', error)
    return { error: error.message }
  }

  // Create profile immediately after successful signup
  // Use service role client to bypass RLS
  if (authData.user) {
    const adminClient = createServiceRoleClient()
    const { error: profileError } = await adminClient
      .from('profiles')
      .insert({
        id: authData.user.id,
        email: authData.user.email!,
        full_name: fullName,
      })

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // User is already created in auth.users
      // Profile creation failure is not fatal - they can still sign in
    }
  }

  redirect('/dashboard')
}

export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { error } = await supabase.auth.signInWithPassword(data)

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/auth/signin')
}

export async function requestPasswordReset(formData: FormData) {
  const supabase = await createClient()
  const email = formData.get('email') as string

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth/forgot-password/sent')
}

export async function resetPassword(formData: FormData) {
  const supabase = await createClient()
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirm_password') as string

  if (password !== confirmPassword) {
    return { error: 'Passwords do not match' }
  }

  const { error } = await supabase.auth.updateUser({
    password: password,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/auth/signin?reset=success')
}
