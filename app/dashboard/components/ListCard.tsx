'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, Archive, ArchiveRestore, Share2, Users, LogOut } from 'lucide-react'
import { ListItemsSection } from './ListItemsSection'
import { ShareListDialog } from './ShareListDialog'
import { createClient } from '@/lib/supabase/client'
import { leaveList } from '../actions'
import {
  mergeFetchedItems,
  type Category,
  type GroceryList,
  type ListItem,
} from '@/lib/list-state'

export function ListCard({
  list,
  userId,
  onRemove,
  onToggleActive,
}: {
  list: GroceryList
  userId: string
  onRemove?: (id: string) => void
  onToggleActive?: (id: string, isActive: boolean) => void
}) {
  const [items, setItems] = useState<ListItem[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isActive, setIsActive] = useState(list.is_active)
  const [showShareDialog, setShowShareDialog] = useState(false)
  const fetchSeq = useRef(0)

  // Fetch items and categories for this list. Guarded so an older in-flight
  // response can never overwrite a newer one, and so optimistic temp items
  // (not yet committed to the DB) survive the wholesale replace.
  const fetchData = useCallback(async () => {
    const seq = ++fetchSeq.current
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

    if (seq !== fetchSeq.current) return

    setItems(prev => mergeFetchedItems(prev, itemsData || []))
    setCategories(categoriesData || [])
    setLoading(false)
  }, [list.id])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Refetch when the tab becomes visible again, for shared list sync
  // (realtime events can be missed while the tab is backgrounded)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') fetchData()
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchData])

  // Real-time subscription for items in this list
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel(`list-items-${list.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          // Apply update directly from payload to avoid stale-read race
          const updated = payload.new as ListItem
          setItems(prev => prev.map(item =>
            item.id === updated.id ? updated : item
          ))
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          const newItem = payload.new as ListItem & { user_id?: string }
          // Skip our own inserts — the API response already handles temp→real swap
          if (newItem.user_id === userId) return
          setItems(prev => {
            if (prev.some(item => item.id === newItem.id)) return prev
            return [newItem, ...prev]
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'list_items',
          filter: `list_id=eq.${list.id}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setItems(prev => prev.filter(item => item.id !== deletedId))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [list.id, userId])

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

    try {
      const response = await fetch('/api/lists', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: list.id, is_active: newActiveState }),
      })
      if (!response.ok) throw new Error('Failed to update list')
    } catch {
      // Revert the optimistic update
      setIsActive(!newActiveState)
      onToggleActive?.(list.id, !newActiveState)
    }
  }

  function handleItemsChange(updater: ListItem[] | ((prev: ListItem[]) => ListItem[])) {
    setItems(updater)
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
            <p className="text-sm text-muted-foreground">Loading items...</p>
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
