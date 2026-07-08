import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Create category
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const body = await request.json()
    const { name, color, icon, list_id } = body

    if (!list_id) {
      return NextResponse.json({ error: 'List ID required' }, { status: 400 })
    }

    // RLS enforces that the user is a member of the list
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name,
        color: color || '#6B7280',
        icon: icon || null,
        list_id,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    return NextResponse.json({ data })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

// Delete category
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
      return NextResponse.json({ error: 'Category ID required' }, { status: 400 })
    }

    // RLS restricts category deletion to list owners; filtering by user_id
    // here would silently skip categories created by other list members
    const { data, error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (!data || data.length === 0) {
      return NextResponse.json(
        { error: 'Category not found or you are not the list owner' },
        { status: 403 }
      )
    }

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
