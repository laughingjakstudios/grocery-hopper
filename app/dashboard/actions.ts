'use server'

import { createClient } from '@/lib/supabase/server'

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
// GROCERY LIST ACTIONS
// ============================================================================

export async function createGroceryList(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string

  // Create the list
  const { data: list, error } = await supabase
    .from('grocery_lists')
    .insert({
      name,
      description: description || null,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) {
    console.error('Create list error:', error)
    return { error: error.message }
  }

  // Create list_shares entry for owner
  const { error: shareError } = await supabase
    .from('list_shares')
    .insert({
      list_id: list.id,
      user_id: user.id,
      role: 'owner',
    })

  if (shareError) {
    console.error('Create list share error:', shareError)
    // List was created, but share failed - still return success
    // The migration should have created this entry anyway
  }

  return { success: true, listId: list.id }
}

export async function updateGroceryList(listId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string
  const description = formData.get('description') as string

  const { error } = await supabase
    .from('grocery_lists')
    .update({
      name,
      description: description || null,
    })
    .eq('id', listId)
    .eq('user_id', user.id) // Ensure user owns this list

  if (error) {
    console.error('Update list error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteGroceryList(listId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('grocery_lists')
    .delete()
    .eq('id', listId)
    .eq('user_id', user.id) // Ensure user owns this list

  if (error) {
    console.error('Delete list error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function toggleListActive(listId: string, isActive: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('grocery_lists')
    .update({ is_active: isActive })
    .eq('id', listId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Toggle list error:', error)
    return { error: error.message }
  }

  return { success: true }
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

// ============================================================================
// LIST ITEM ACTIONS
// ============================================================================

export async function addListItem(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string
  const quantity = formData.get('quantity') as string
  const notes = formData.get('notes') as string
  const categoryId = formData.get('category_id') as string
  const listId = formData.get('list_id') as string

  // Check if user has access to the list
  const { hasAccess } = await checkListAccess(supabase, listId, user.id)
  if (!hasAccess) {
    return { error: 'You do not have access to this list' }
  }

  const { error } = await supabase
    .from('list_items')
    .insert({
      name,
      quantity: quantity || null,
      notes: notes || null,
      category_id: categoryId || null,
      list_id: listId,
      user_id: user.id, // Track who added the item
    })

  if (error) {
    console.error('Add item error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function updateListItem(itemId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the item's list_id to check access
  const { data: item } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('id', itemId)
    .single()

  if (!item) {
    return { error: 'Item not found' }
  }

  const { hasAccess } = await checkListAccess(supabase, item.list_id, user.id)
  if (!hasAccess) {
    return { error: 'You do not have access to this list' }
  }

  const name = formData.get('name') as string
  const quantity = formData.get('quantity') as string
  const notes = formData.get('notes') as string
  const categoryId = formData.get('category_id') as string

  const { error } = await supabase
    .from('list_items')
    .update({
      name,
      quantity: quantity || null,
      notes: notes || null,
      category_id: categoryId || null,
    })
    .eq('id', itemId)

  if (error) {
    console.error('Update item error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteListItem(itemId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the item's list_id to check access
  const { data: item } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('id', itemId)
    .single()

  if (!item) {
    return { error: 'Item not found' }
  }

  const { hasAccess } = await checkListAccess(supabase, item.list_id, user.id)
  if (!hasAccess) {
    return { error: 'You do not have access to this list' }
  }

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', itemId)

  if (error) {
    console.error('Delete item error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function toggleItemChecked(itemId: string, isChecked: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get the item's list_id to check access
  const { data: item } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('id', itemId)
    .single()

  if (!item) {
    return { error: 'Item not found' }
  }

  const { hasAccess } = await checkListAccess(supabase, item.list_id, user.id)
  if (!hasAccess) {
    return { error: 'You do not have access to this list' }
  }

  const { error } = await supabase
    .from('list_items')
    .update({ is_checked: isChecked })
    .eq('id', itemId)

  if (error) {
    console.error('Toggle item error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function clearCheckedItems(listId: string) {
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

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('is_checked', true)

  if (error) {
    console.error('Clear checked items error:', error)
    return { error: error.message }
  }

  return { success: true }
}

// ============================================================================
// CATEGORY ACTIONS (now list-level)
// ============================================================================

export async function createCategory(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  const name = formData.get('name') as string
  const color = formData.get('color') as string
  const icon = formData.get('icon') as string
  const listId = formData.get('list_id') as string

  if (!listId) {
    return { error: 'List ID is required' }
  }

  // Check if user has access to the list
  const { hasAccess } = await checkListAccess(supabase, listId, user.id)
  if (!hasAccess) {
    return { error: 'You do not have access to this list' }
  }

  const { error } = await supabase
    .from('categories')
    .insert({
      name,
      color: color || '#6B7280',
      icon: icon || null,
      list_id: listId,
      user_id: user.id, // Keep for legacy/tracking
    })

  if (error) {
    console.error('Create category error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function updateCategory(categoryId: string, formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get category's list_id to check access
  const { data: category } = await supabase
    .from('categories')
    .select('list_id')
    .eq('id', categoryId)
    .single()

  if (!category || !category.list_id) {
    return { error: 'Category not found' }
  }

  const { hasAccess } = await checkListAccess(supabase, category.list_id, user.id)
  if (!hasAccess) {
    return { error: 'You do not have access to this list' }
  }

  const name = formData.get('name') as string
  const color = formData.get('color') as string
  const icon = formData.get('icon') as string

  const { error } = await supabase
    .from('categories')
    .update({
      name,
      color: color || '#6B7280',
      icon: icon || null,
    })
    .eq('id', categoryId)

  if (error) {
    console.error('Update category error:', error)
    return { error: error.message }
  }

  return { success: true }
}

export async function deleteCategory(categoryId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get category's list_id to check access (owner only)
  const { data: category } = await supabase
    .from('categories')
    .select('list_id')
    .eq('id', categoryId)
    .single()

  if (!category || !category.list_id) {
    return { error: 'Category not found' }
  }

  // Only owners can delete categories
  const { hasAccess } = await checkListAccess(supabase, category.list_id, user.id, 'owner')
  if (!hasAccess) {
    return { error: 'Only list owners can delete categories' }
  }

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)

  if (error) {
    console.error('Delete category error:', error)
    return { error: error.message }
  }

  return { success: true }
}

// ============================================================================
// FETCH LISTS WITH SHARES
// ============================================================================

export async function getAccessibleLists() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Not authenticated' }
  }

  // Get all lists the user has access to via list_shares
  const { data: shares, error: sharesError } = await supabase
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
    .order('joined_at', { ascending: false })

  if (sharesError) {
    console.error('Get accessible lists error:', sharesError)
    return { error: sharesError.message }
  }

  // Transform the data to include role info
  const lists = shares?.map(share => ({
    ...share.grocery_lists,
    myRole: share.role,
    isOwner: share.role === 'owner',
    isShared: share.role !== 'owner',
  })) || []

  return { success: true, lists }
}
