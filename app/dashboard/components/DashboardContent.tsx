'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ListCard } from './ListCard'
import { HamburgerMenu } from './HamburgerMenu'
import { createClient } from '@/lib/supabase/client'

const SELECTED_LIST_KEY = 'grocery-hopper-selected-list'

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

interface DashboardContentProps {
  initialLists: GroceryList[]
  userId: string
}

export function DashboardContent({ initialLists, userId }: DashboardContentProps) {
  const [lists, setLists] = useState(initialLists)
  const [selectedListId, setSelectedListId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return initialLists[0]?.id ?? null
    const saved = localStorage.getItem(SELECTED_LIST_KEY)
    if (saved && initialLists.some(l => l.id === saved)) return saved
    return initialLists[0]?.id ?? null
  })
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Persist selected list
  useEffect(() => {
    if (selectedListId) localStorage.setItem(SELECTED_LIST_KEY, selectedListId)
  }, [selectedListId])

  const selectedList = lists.find(l => l.id === selectedListId)

  // Fetch lists from client-side
  const fetchLists = useCallback(async () => {
    setIsRefreshing(true)
    try {
      const supabase = createClient()

      const { data: shares, error } = await supabase
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
        .eq('user_id', userId)

      if (error) {
        console.error('Failed to fetch lists:', error)
        return
      }

      type GroceryListData = {
        id: string
        name: string
        description: string | null
        is_active: boolean
        share_code: string | null
        user_id: string
        created_at: string
        updated_at: string
      }

      const freshLists = shares?.map(share => {
        const listData = share.grocery_lists as unknown as GroceryListData
        return {
          ...listData,
          myRole: share.role as 'owner' | 'editor',
          isOwner: share.role === 'owner',
          isShared: share.role !== 'owner',
        }
      }).sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }) || []

      setLists(freshLists)
    } catch (error) {
      console.error('Failed to fetch lists:', error)
    } finally {
      setIsRefreshing(false)
    }
  }, [userId])

  // Refetch on window focus (user comes back to browser)
  useEffect(() => {
    const handleFocus = () => {
      fetchLists()
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchLists])

  // Refetch on visibility change (user switches back to tab)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchLists()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [fetchLists])

  // Subscribe to real-time changes on list_shares (new shares, removed shares)
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('list-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'list_shares',
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Refetch lists when shares change
          fetchLists()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'grocery_lists',
        },
        (payload) => {
          // Update list in place if it's one we have access to
          setLists(prev => prev.map(list =>
            list.id === payload.new.id
              ? { ...list, ...payload.new }
              : list
          ))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [userId, fetchLists])

  // Listen for new list additions from HamburgerMenu
  useEffect(() => {
    const handleNewList = (event: CustomEvent<GroceryList>) => {
      // New lists created by the user are always owned
      const newList = {
        ...event.detail,
        myRole: 'owner' as const,
        isOwner: true,
        isShared: false,
        share_code: null,
      }
      setLists((prev) => [newList, ...prev])
      setSelectedListId(event.detail.id)
    }

    window.addEventListener('new-list-created' as any, handleNewList)
    return () => window.removeEventListener('new-list-created' as any, handleNewList)
  }, [])

  // Listen for voice command completions (for items added via voice)
  useEffect(() => {
    const handleVoiceSuccess = () => {
      // Voice commands might add items, but items are managed per-card
      // No need to refresh lists here
    }

    window.addEventListener('voice-command-success', handleVoiceSuccess)
    return () => window.removeEventListener('voice-command-success', handleVoiceSuccess)
  }, [])

  // Handle list deletion or leaving — update selection synchronously
  function handleRemoveList(listId: string) {
    setLists((prev) => {
      const next = prev.filter((list) => list.id !== listId)
      if (listId === selectedListId) {
        setSelectedListId(next[0]?.id ?? null)
      }
      return next
    })
  }

  // Handle list archive/restore
  function handleToggleActive(listId: string, isActive: boolean) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, is_active: isActive } : list
      )
    )
  }

  return (
    <>
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3">
          <h1 className="text-xl font-bold text-primary">GroceryHopper</h1>
          <HamburgerMenu
            lists={lists}
            selectedListId={selectedListId}
            onSelectList={setSelectedListId}
          />
        </div>
        {isRefreshing && (
          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary/20 overflow-hidden">
            <div className="h-full w-1/3 bg-primary animate-pulse" />
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-4">
        {!lists || lists.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle>No lists yet</CardTitle>
              <CardDescription>
                Create your first grocery list to get started!
              </CardDescription>
            </CardHeader>
          </Card>
        ) : selectedList ? (
          <ListCard
            key={selectedList.id}
            list={selectedList}
            userId={userId}
            onRemove={handleRemoveList}
            onToggleActive={handleToggleActive}
          />
        ) : null}
      </main>
    </>
  )
}
