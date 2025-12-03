'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Archive, ArchiveRestore } from 'lucide-react'
import { ListItemsSection } from './ListItemsSection'
import { createClient } from '@/lib/supabase/client'

type GroceryList = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  created_at: string
}

type Category = {
  id: string
  name: string
  color: string
  icon: string | null
}

type ListItem = {
  id: string
  name: string
  quantity: string | null
  notes: string | null
  is_checked: boolean
  category_id: string | null
  list_id: string
}

export function ListCard({
  list,
  categories,
  onDelete,
  onToggleActive,
}: {
  list: GroceryList
  categories: Category[]
  onDelete?: (id: string) => void
  onToggleActive?: (id: string, isActive: boolean) => void
}) {
  const [items, setItems] = useState<ListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(list.is_active)

  // Fetch items for this list
  async function fetchItems() {
    const supabase = createClient()

    const { data } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', list.id)
      .order('is_checked')
      .order('created_at', { ascending: false })

    setItems(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchItems()
  }, [list.id])

  const uncheckedCount = items.filter((item) => !item.is_checked).length
  const checkedCount = items.filter((item) => item.is_checked).length

  async function handleDelete() {
    if (confirm('Are you sure you want to delete this list?')) {
      // Optimistically call parent
      onDelete?.(list.id)

      // Make API call
      await fetch(`/api/lists?id=${list.id}`, {
        method: 'DELETE',
      })
    }
  }

  async function handleToggleActive() {
    const newActiveState = !isActive

    // Optimistic update
    setIsActive(newActiveState)
    onToggleActive?.(list.id, newActiveState)

    // Make API call
    const supabase = createClient()
    await supabase
      .from('grocery_lists')
      .update({ is_active: newActiveState })
      .eq('id', list.id)
  }

  // Handle items change from ListItemsSection
  function handleItemsChange(newItems: ListItem[]) {
    setItems(newItems)
  }

  return (
    <Card className={!isActive ? 'opacity-60' : ''}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {list.name}
              {!isActive && <Badge variant="secondary">Archived</Badge>}
            </CardTitle>
            {list.description && (
              <CardDescription>{list.description}</CardDescription>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleActive}
              title={isActive ? 'Archive list' : 'Restore list'}
            >
              {isActive ? (
                <Archive className="h-4 w-4" />
              ) : (
                <ArchiveRestore className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDelete}
              title="Delete list"
            >
              <Trash2 className="h-4 w-4 text-red-500" />
            </Button>
          </div>
        </div>
        <div className="flex gap-2 pt-2">
          <Badge variant="outline">
            {uncheckedCount} to buy
          </Badge>
          {checkedCount > 0 && (
            <Badge variant="secondary">
              {checkedCount} checked
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-gray-500">Loading items...</p>
        ) : (
          <ListItemsSection
            listId={list.id}
            items={items}
            categories={categories}
            onItemsChange={handleItemsChange}
          />
        )}
      </CardContent>
    </Card>
  )
}
