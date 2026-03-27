'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Menu, Plus, Tag, LogOut, X, List, Check, Users } from 'lucide-react'
import { CategoriesManager } from './CategoriesManager'

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

export function HamburgerMenu({
  lists,
  selectedListId,
  onSelectList,
  onListCreated,
}: {
  lists: GroceryList[]
  selectedListId: string | null
  onSelectList: (id: string) => void
  onListCreated: (list: GroceryList) => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [newListOpen, setNewListOpen] = useState(false)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const router = useRouter()

  async function handleCreateList(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)

    const response = await fetch('/api/lists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: formData.get('name'),
        description: formData.get('description'),
      }),
    })

    if (response.ok) {
      const newList = await response.json()
      onListCreated({
        ...newList,
        myRole: 'owner' as const,
        isOwner: true,
        isShared: false,
        share_code: null,
      })
      setNewListOpen(false)
      setMenuOpen(false)
    }
  }

  async function handleSignOut() {
    await fetch('/api/auth/signout', { method: 'POST' })
    router.push('/auth/signin')
    router.refresh()
  }

  return (
    <>
      {/* Hamburger Button */}
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label="Menu"
      >
        {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
      </Button>

      {/* Dropdown Menu */}
      {menuOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setMenuOpen(false)}
          />

          {/* Menu Panel */}
          <div className="absolute right-4 top-14 z-50 w-56 rounded-lg border bg-white shadow-lg">
            <div className="p-2">
              {/* Lists */}
              {lists.length > 0 && (
                <>
                  <p className="px-3 py-1 text-xs font-medium text-gray-400 uppercase tracking-wider">Lists</p>
                  {lists.map((list) => (
                    <button
                      key={list.id}
                      onClick={() => {
                        onSelectList(list.id)
                        setMenuOpen(false)
                      }}
                      className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm ${
                        list.id === selectedListId
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'hover:bg-gray-100'
                      } ${!list.is_active ? 'opacity-50' : ''}`}
                    >
                      {list.id === selectedListId ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <List className="h-4 w-4" />
                      )}
                      <span className="truncate">{list.name}</span>
                      {list.isShared && <Users className="h-3 w-3 ml-auto text-gray-400" />}
                    </button>
                  ))}
                  <hr className="my-2" />
                </>
              )}

              <button
                onClick={() => {
                  setNewListOpen(true)
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                <Plus className="h-4 w-4" />
                New List
              </button>

              <button
                onClick={() => {
                  setCategoriesOpen(true)
                  setMenuOpen(false)
                }}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-gray-100"
              >
                <Tag className="h-4 w-4" />
                Categories
              </button>

              <hr className="my-2" />

              <button
                onClick={handleSignOut}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                Sign Out
              </button>
            </div>
          </div>
        </>
      )}

      {/* New List Dialog */}
      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New List</DialogTitle>
            <DialogDescription>
              Create a new grocery shopping list
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateList} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">List Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="Weekly Groceries"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                name="description"
                placeholder="Shopping for the week"
              />
            </div>
            <Button type="submit" className="w-full">
              Create List
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Categories Dialog */}
      <Dialog open={categoriesOpen} onOpenChange={setCategoriesOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>
              Create and manage categories for organizing your grocery items
            </DialogDescription>
          </DialogHeader>
          <CategoriesManager />
        </DialogContent>
      </Dialog>
    </>
  )
}
