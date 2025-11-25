'use server'

import { createClient } from '@/lib/supabase/server'

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

  const { error } = await supabase
    .from('grocery_lists')
    .insert({
      name,
      description: description || null,
      user_id: user.id,
    })

  if (error) {
    console.error('Create list error:', error)
    return { error: error.message }
  }

  return { success: true }
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

  const { error } = await supabase
    .from('list_items')
    .insert({
      name,
      quantity: quantity || null,
      notes: notes || null,
      category_id: categoryId || null,
      list_id: listId,
      user_id: user.id,
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
    .eq('user_id', user.id)

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

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('id', itemId)
    .eq('user_id', user.id)

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

  const { error } = await supabase
    .from('list_items')
    .update({ is_checked: isChecked })
    .eq('id', itemId)
    .eq('user_id', user.id)

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

  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('user_id', user.id)
    .eq('is_checked', true)

  if (error) {
    console.error('Clear checked items error:', error)
    return { error: error.message }
  }

  return { success: true }
}

// ============================================================================
// CATEGORY ACTIONS
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

  const { error } = await supabase
    .from('categories')
    .insert({
      name,
      color: color || '#6B7280',
      icon: icon || null,
      user_id: user.id,
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
    .eq('user_id', user.id)

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

  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', categoryId)
    .eq('user_id', user.id)

  if (error) {
    console.error('Delete category error:', error)
    return { error: error.message }
  }

  return { success: true }
}
