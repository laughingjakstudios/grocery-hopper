'use server'

import { createClient } from '@/lib/supabase/server'

// List CRUD and item/category mutations live in the /api routes (app/api/*),
// which the optimistic-update components call via fetch. These server actions
// cover the sharing flows used by ShareListDialog, JoinListClient, and ListCard.

// ============================================================================
// HELPER: Check if user has access to a list
// ============================================================================

async function checkListAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  listId: string,
  userId: string,
  requiredRole?: 'owner' | 'editor'
): Promise<{ hasAccess: boolean; role?: string }> {
  const { data } = await supabase
    .from('list_shares')
    .select('role')
    .eq('list_id', listId)
    .eq('user_id', userId)
    .single()

  if (!data) return { hasAccess: false }
  if (requiredRole === 'owner' && data.role !== 'owner') return { hasAccess: false }
  return { hasAccess: true, role: data.role }
}

// ============================================================================
// HELPER: Generate share code
// ============================================================================

function generateShareCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// ============================================================================
// LIST SHARING ACTIONS
// ============================================================================

export async function generateShareLink(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is owner
  const { hasAccess } = await checkListAccess(supabase, listId, user.id, 'owner')
  if (!hasAccess) {
    return { error: 'Only list owners can generate share links' }
  }

  // Check if list already has a share code
  const { data: list } = await supabase
    .from('grocery_lists')
    .select('share_code')
    .eq('id', listId)
    .single()

  if (list?.share_code) {
    return { success: true, shareCode: list.share_code }
  }

  // Generate new share code
  const shareCode = generateShareCode()
  const { error } = await supabase
    .from('grocery_lists')
    .update({ share_code: shareCode })
    .eq('id', listId)

  if (error) {
    console.error('Generate share link error:', error)
    return { error: error.message }
  }

  return { success: true, shareCode }
}

export async function revokeShareLink(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user is owner
  const { hasAccess } = await checkListAccess(supabase, listId, user.id, 'owner')
  if (!hasAccess) {
    return { error: 'Only list owners can revoke share links' }
  }

  const { error } = await supabase
    .from('grocery_lists')
    .update({ share_code: null })
    .eq('id', listId)

  if (error) {
    console.error('Revoke share link error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function joinListByCode(shareCode: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Find list by share code
  const { data: list, error: listError } = await supabase
    .from('grocery_lists')
    .select('id, name')
    .eq('share_code', shareCode)
    .single()

  if (listError || !list) {
    return { error: 'Invalid or expired share link' }
  }

  // Check if user already has access
  const { data: existingShare } = await supabase
    .from('list_shares')
    .select('id')
    .eq('list_id', list.id)
    .eq('user_id', user.id)
    .single()

  if (existingShare) {
    return { success: true, listId: list.id, listName: list.name, alreadyMember: true }
  }

  // Add user as editor
  const { error } = await supabase
    .from('list_shares')
    .insert({
      list_id: list.id,
      user_id: user.id,
      role: 'editor',
    })

  if (error) {
    console.error('Join list error:', error)
    return { error: error.message }
  }

  return { success: true, listId: list.id, listName: list.name }
}

export async function leaveList(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check user's role
  const { hasAccess, role } = await checkListAccess(supabase, listId, user.id)
  if (!hasAccess) {
    return { error: 'You are not a member of this list' }
  }

  if (role === 'owner') {
    return { error: 'Owners cannot leave their own list. Delete it instead.' }
  }

  const { error } = await supabase
    .from('list_shares')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Leave list error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function removeListMember(listId: string, memberId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if current user is owner
  const { hasAccess } = await checkListAccess(supabase, listId, user.id, 'owner')
  if (!hasAccess) {
    return { error: 'Only list owners can remove members' }
  }

  // Cannot remove yourself (owner)
  if (memberId === user.id) {
    return { error: 'Cannot remove yourself. Delete the list instead.' }
  }

  const { error } = await supabase
    .from('list_shares')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', memberId)

  if (error) {
    console.error('Remove member error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function getListMembers(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Check if user has access to the list
  const { hasAccess } = await checkListAccess(supabase, listId, user.id)
  if (!hasAccess) {
    return { error: 'You do not have access to this list' }
  }

  const { data: members, error } = await supabase
    .from('list_shares')
    .select(`
      id,
      role,
      joined_at,
      user_id,
      profiles!inner (
        id,
        email,
        full_name,
        avatar_url
      )
    `)
    .eq('list_id', listId)
    .order('role', { ascending: true }) // owners first
    .order('joined_at', { ascending: true })

  if (error) {
    console.error('Get list members error:', error)
    return { error: error.message }
  }

  return { success: true, members }
}
