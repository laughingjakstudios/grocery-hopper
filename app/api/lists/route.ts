import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { name, description } = body

    // Create the list
    const { data, error } = await supabase
      .from('grocery_lists')
      .insert({
        name,
        description: description || null,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    // Create list_shares entry for the owner
    const { error: shareError } = await supabase
      .from('list_shares')
      .insert({
        list_id: data.id,
        user_id: user.id,
        role: 'owner',
      })

    if (shareError) {
      // If share creation fails, delete the list to keep things consistent
      await supabase.from('grocery_lists').delete().eq('id', data.id)
      return NextResponse.json({ error: 'Failed to initialize list access' }, { status: 400 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'List ID required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('grocery_lists')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
