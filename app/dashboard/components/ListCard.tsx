'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Archive, ArchiveRestore, Share2, Users, LogOut } from 'lucide-react'
import { ListItemsSection } from './ListItemsSection'
import { ShareListDialog } from './ShareListDialog'
import { createClient } from '@/lib/supabase/client'
import { leaveList } from '../actions'

type GroceryList = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  share_code: string | null
  created_at: string
  user_id: string
  myRole: 'owner' | 'editor'
  isOwner: boolean
  isShared: boolean
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
  onRemove,
  onToggleActive,
}: {
  list: GroceryList
  onRemove?: (id: string) => void
  onToggleActive?: (id: string, isActive: boolean) => void
}) {
  const [items, setItems] = useState<ListItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(list.is_active)
  const [showShareDialog, setShowShareDialog] = useState(false)

  // Fetch items and categories for this list
  async function fetchData() {
    const supabase = createClient()

    // Fetch items
    const { data: itemsData } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', list.id)
      .order('is_checked')
      .order('created_at', { ascending: false })

    // Fetch categories for this list
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('*')
      .eq('list_id', list.id)
      .order('name')

    setItems(itemsData || [])
    setCategories(categoriesData || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [list.id])

  const uncheckedCount = items.filter((item) => !item.is_checked).length
  const checkedCount = items.filter((item) => item.is_checked).length

  async function handleDelete() {
    if (confirm('Are you sure you want to delete this list? This cannot be undone.')) {
      onRemove?.(list.id)
      await fetch(`/api/lists?id=${list.id}`, { method: 'DELETE' })
    }
  }

  async function handleLeave() {
    if (confirm(`Are you sure you want to leave "${list.name}"? You will lose access to this list.`)) {
      onRemove?.(list.id)
      await leaveList(list.id)
    }
  }

  async function handleToggleActive() {
    const newActiveState = !isActive
    setIsActive(newActiveState)
    onToggleActive?.(list.id, newActiveState)

    const supabase = createClient()
    await supabase
      .from('grocery_lists')
      .update({ is_active: newActiveState })
      .eq('id', list.id)
  }

  function handleItemsChange(newItems: ListItem[]) {
    setItems(newItems)
  }

  function handleCategoriesChange(newCategories: Category[]) {
    setCategories(newCategories)
  }

  return (
    <>
      <Card className={!isActive ? 'opacity-60' : ''}>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                {list.name}
                {!isActive && <Badge variant="secondary">Archived</Badge>}
                {list.isShared && (
                  <Badge variant="outline" className="gap-1">
                    <Users className="h-3 w-3" />
                    Shared
                  </Badge>
                )}
              </CardTitle>
              {list.description && (
                <CardDescription>{list.description}</CardDescription>
              )}
            </div>
            <div className="flex gap-1">
              {/* Share button - only for owners */}
              {list.isOwner && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowShareDialog(true)}
                  title="Share list"
                >
                  <Share2 className="h-4 w-4" />
                </Button>
              )}
              {/* Archive toggle - only for owners */}
              {list.isOwner && (
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
              )}
              {/* Delete (owner) or Leave (editor) */}
              {list.isOwner ? (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  title="Delete list"
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLeave}
                  title="Leave list"
                >
                  <LogOut className="h-4 w-4 text-orange-500" />
                </Button>
              )}
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
              onCategoriesChange={handleCategoriesChange}
            />
          )}
        </CardContent>
      </Card>

      {/* Share Dialog */}
      {showShareDialog && (
        <ShareListDialog
          listId={list.id}
          listName={list.name}
          shareCode={list.share_code}
          onClose={() => setShowShareDialog(false)}
        />
      )}
    </>
  )
}
