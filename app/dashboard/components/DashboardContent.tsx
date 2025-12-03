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
  created_at: string
  user_id: string
}

type Category = {
  id: string
  name: string
  color: string
  icon: string | null
}

interface DashboardContentProps {
  initialLists: GroceryList[]
  initialCategories: Category[]
  userId: string
}

export function DashboardContent({ initialLists, initialCategories, userId }: DashboardContentProps) {
  const [lists, setLists] = useState(initialLists)
  const [categories] = useState(initialCategories)

  // Listen for new list additions from HamburgerMenu
  useEffect(() => {
    const handleNewList = (event: CustomEvent<GroceryList>) => {
      setLists((prev) => [event.detail, ...prev])
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

  // Handle list deletion
  function handleDeleteList(listId: string) {
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
              categories={categories || []}
              onDelete={handleDeleteList}
              onToggleActive={handleToggleActive}
            />
          ))}
        </ListCarousel>
      )}
    </>
  )
}
