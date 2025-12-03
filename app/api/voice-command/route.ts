import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { parseVoiceCommand, formatCommandSummary } from '@/lib/voice-parser'

export async function POST(request: NextRequest) {
  try {
    const { transcript, listId } = await request.json()

    if (!transcript) {
      return NextResponse.json(
        { error: 'No transcript provided' },
        { status: 400 }
      )
    }

    // Clean transcript - remove trailing punctuation from speech recognition
    const cleanedTranscript = transcript.trim().replace(/[.,!?;:]+$/, '')
    console.log('Original transcript:', transcript)
    console.log('Cleaned transcript:', cleanedTranscript)

    // Parse the voice command
    const command = parseVoiceCommand(cleanedTranscript)
    console.log('Parsed command:', command)

    // Get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Determine target list
    let targetListId = listId
    let targetListName = ''

    if (!targetListId) {
      if (command.targetList) {
        // User specified a list by name - find it
        const { data: namedList } = await supabase
          .from('grocery_lists')
          .select('id, name')
          .eq('user_id', user.id)
          .ilike('name', `%${command.targetList}%`)
          .single()

        if (namedList) {
          targetListId = namedList.id
          targetListName = namedList.name
        } else {
          return NextResponse.json(
            { error: `Could not find a list matching "${command.targetList}"` },
            { status: 400 }
          )
        }
      }

      // Fallback to default active list
      if (!targetListId) {
        const { data: activeList } = await supabase
          .from('grocery_lists')
          .select('id, name')
          .eq('user_id', user.id)
          .eq('is_active', true)
          .order('created_at', { ascending: false })
          .limit(1)
          .single()

        if (!activeList) {
          return NextResponse.json(
            { error: 'No active shopping list found. Create a list first!' },
            { status: 400 }
          )
        }

        targetListId = activeList.id
        targetListName = activeList.name
      }
    } else {
      // If listId was provided, get the list name
      const { data: list } = await supabase
        .from('grocery_lists')
        .select('name')
        .eq('id', targetListId)
        .single()

      if (list) {
        targetListName = list.name
      }
    }

    // Execute the command
    let result: string

    switch (command.action) {
      case 'add':
        result = await addItems(supabase, targetListId, command.items)
        break

      case 'complete':
        result = await toggleItems(supabase, targetListId, command.items, true)
        break

      case 'uncomplete':
        result = await toggleItems(supabase, targetListId, command.items, false)
        break

      case 'remove':
        result = await removeItems(supabase, targetListId, command.items)
        break

      default:
        return NextResponse.json(
          { error: 'Unknown action' },
          { status: 400 }
        )
    }

    // Format message with list name
    const messageWithList = targetListName
      ? `${result} to "${targetListName}"`
      : result

    // Revalidate the dashboard to show updated data
    revalidatePath('/dashboard')

    return NextResponse.json({
      success: true,
      message: messageWithList,
      command: formatCommandSummary(command),
    })

  } catch (error) {
    console.error('Voice command error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to process command' },
      { status: 500 }
    )
  }
}

/**
 * Add items to the list
 */
async function addItems(
  supabase: any,
  listId: string,
  items: { name: string; quantity?: number; unit?: string }[]
) {
  // Get user_id from the list
  const { data: listData } = await supabase
    .from('grocery_lists')
    .select('user_id')
    .eq('id', listId)
    .single()

  if (!listData) {
    throw new Error('List not found')
  }

  const itemsToInsert = items.map(item => {
    // Format quantity as string (e.g., "3", "2 lbs")
    let quantityStr = null
    if (item.quantity && item.unit) {
      quantityStr = `${item.quantity} ${item.unit}`
    } else if (item.quantity && item.quantity > 1) {
      quantityStr = `${item.quantity}`
    }

    return {
      list_id: listId,
      user_id: listData.user_id,
      name: item.name,
      quantity: quantityStr,
      is_checked: false,
    }
  })

  const { data, error } = await supabase
    .from('list_items')
    .insert(itemsToInsert)
    .select()

  if (error) {
    throw new Error(`Failed to add items: ${error.message}`)
  }

  if (!data || data.length === 0) {
    throw new Error('Items were not inserted')
  }

  const count = items.length
  return `Added ${count} ${count === 1 ? 'item' : 'items'}`
}

/**
 * Toggle items checked/unchecked
 */
async function toggleItems(
  supabase: any,
  listId: string,
  items: { name: string }[],
  checked: boolean
) {
  let updatedCount = 0

  for (const item of items) {
    // Find items by name (case-insensitive)
    const { data: matchingItems } = await supabase
      .from('list_items')
      .select('id')
      .eq('list_id', listId)
      .ilike('name', item.name)

    if (matchingItems && matchingItems.length > 0) {
      const ids = matchingItems.map((i: any) => i.id)

      const { error } = await supabase
        .from('list_items')
        .update({ is_checked: checked })
        .in('id', ids)

      if (!error) {
        updatedCount += matchingItems.length
      }
    }
  }

  if (updatedCount === 0) {
    throw new Error('No matching items found')
  }

  const action = checked ? 'Checked off' : 'Unchecked'
  return `${action} ${updatedCount} ${updatedCount === 1 ? 'item' : 'items'}`
}

/**
 * Remove items from the list
 */
async function removeItems(
  supabase: any,
  listId: string,
  items: { name: string }[]
) {
  let deletedCount = 0

  for (const item of items) {
    // Find items by name (case-insensitive)
    const { data: matchingItems } = await supabase
      .from('list_items')
      .select('id')
      .eq('list_id', listId)
      .ilike('name', item.name)

    if (matchingItems && matchingItems.length > 0) {
      const ids = matchingItems.map((i: any) => i.id)

      const { error } = await supabase
        .from('list_items')
        .delete()
        .in('id', ids)

      if (!error) {
        deletedCount += matchingItems.length
      }
    }
  }

  if (deletedCount === 0) {
    throw new Error('No matching items found')
  }

  return `Removed ${deletedCount} ${deletedCount === 1 ? 'item' : 'items'}`
}
