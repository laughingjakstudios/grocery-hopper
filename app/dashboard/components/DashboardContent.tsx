'use client'

import { useEffect, useState } from 'react'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ListCard } from './ListCard'
import { ListCarousel } from './ListCarousel'

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

  // Handle list deletion or leaving
  function handleRemoveList(listId: string) {
    setLists((prev) => prev.filter((list) => list.id !== listId))
  }

  // Handle list archive/restore
  function handleToggleActive(listId: string, isActive: boolean) {
    setLists((prev) =>
      prev.map((list) =>
        list.id === listId ? { ...list, is_active: isActive } : list
      )
    )
  }

  const listCount = lists?.length || 0

  return (
    <>
      {/* Lists Carousel */}
      {!lists || lists.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No lists yet</CardTitle>
            <CardDescription>
              Create your first grocery list to get started!
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ListCarousel totalCount={listCount}>
          {lists.map((list) => (
            <ListCard
              key={list.id}
              list={list}
              onRemove={handleRemoveList}
              onToggleActive={handleToggleActive}
            />
          ))}
        </ListCarousel>
      )}
    </>
  )
}
