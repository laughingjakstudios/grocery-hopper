'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, AlertCircle } from 'lucide-react'

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

type SyncError = {
  message: string
  timestamp: number
}

export function ListItemsSection({
  listId,
  items: initialItems,
  categories,
  onItemsChange,
  onCategoriesChange,
}: {
  listId: string
  items: ListItem[]
  categories: Category[]
  onItemsChange?: (items: ListItem[]) => void
  onCategoriesChange?: (categories: Category[]) => void
}) {
  const router = useRouter()
  const [items, setItems] = useState(initialItems)
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')
  const [isAdding, setIsAdding] = useState(false)
  const [syncError, setSyncError] = useState<SyncError | null>(null)

  const handleAuthError = useCallback(() => {
    // Session expired - redirect to login
    router.push('/login')
  }, [router])

  const handleSyncError = useCallback((message: string) => {
    setSyncError({ message, timestamp: Date.now() })
    // Auto-clear error after 5 seconds
    setTimeout(() => setSyncError(null), 5000)
  }, [])

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName.trim() || isAdding) return

    // Create temp item for immediate display
    const tempId = `temp-${Date.now()}`
    const tempItem: ListItem = {
      id: tempId,
      name: newItemName.trim(),
      quantity: newItemQuantity || null,
      notes: null,
      is_checked: false,
      category_id: newItemCategory === 'none' ? null : newItemCategory || null,
      list_id: listId,
    }

    // Add to UI immediately
    setItems(prev => [tempItem, ...prev])

    // Clear form
    const itemName = newItemName.trim()
    const itemQty = newItemQuantity
    const itemCat = newItemCategory
    setNewItemName('')
    setNewItemQuantity('')
    setNewItemCategory('')
    setIsAdding(true)

    try {
      const response = await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: itemName,
          quantity: itemQty || null,
          category_id: itemCat === 'none' ? null : itemCat || null,
          list_id: listId,
        }),
      })

      if (response.status === 401) {
        // Remove temp item and redirect to login
        setItems(prev => prev.filter(item => item.id !== tempId))
        handleAuthError()
        return
      }

      if (!response.ok) {
        // Remove temp item on failure
        setItems(prev => prev.filter(item => item.id !== tempId))
        handleSyncError(`Failed to add "${itemName}"`)
        return
      }

      const newItem = await response.json()
      // Replace temp item with real item (with real ID)
      setItems(prev => prev.map(item => item.id === tempId ? newItem : item))
    } catch (error) {
      // Network error - remove temp item
      setItems(prev => prev.filter(item => item.id !== tempId))
      handleSyncError(`Failed to add "${itemName}" - check your connection`)
    } finally {
      setIsAdding(false)
    }
  }

  async function handleToggleItem(itemId: string, currentState: boolean) {
    // Update UI immediately
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, is_checked: !currentState } : item
      )
    )

    try {
      const response = await fetch('/api/items', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: itemId,
          is_checked: !currentState,
        }),
      })

      if (response.status === 401) {
        // Revert and redirect to login
        setItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, is_checked: currentState } : item
          )
        )
        handleAuthError()
        return
      }

      if (!response.ok) {
        // Revert on failure
        setItems(prev =>
          prev.map(item =>
            item.id === itemId ? { ...item, is_checked: currentState } : item
          )
        )
        handleSyncError('Failed to update item')
      }
    } catch {
      // Network error - revert
      setItems(prev =>
        prev.map(item =>
          item.id === itemId ? { ...item, is_checked: currentState } : item
        )
      )
      handleSyncError('Failed to update item - check your connection')
    }
  }

  async function handleDeleteItem(itemId: string) {
    // Store item for potential rollback
    const deletedItem = items.find(item => item.id === itemId)

    // Update UI immediately
    setItems(prev => prev.filter(item => item.id !== itemId))

    try {
      const response = await fetch(`/api/items?id=${itemId}`, {
        method: 'DELETE',
      })

      if (response.status === 401) {
        // Restore item and redirect to login
        if (deletedItem) {
          setItems(prev => [...prev, deletedItem])
        }
        handleAuthError()
        return
      }

      if (!response.ok) {
        // Restore item on failure
        if (deletedItem) {
          setItems(prev => [...prev, deletedItem])
        }
        handleSyncError('Failed to delete item')
      }
    } catch {
      // Network error - restore item
      if (deletedItem) {
        setItems(prev => [...prev, deletedItem])
      }
      handleSyncError('Failed to delete item - check your connection')
    }
  }

  async function handleClearChecked() {
    // Store checked items for potential rollback
    const checkedItemsBackup = items.filter(item => item.is_checked)

    // Update UI immediately
    setItems(prev => prev.filter(item => !item.is_checked))

    try {
      const response = await fetch(`/api/items/clear?listId=${listId}`, {
        method: 'DELETE',
      })

      if (response.status === 401) {
        // Restore checked items and redirect to login
        setItems(prev => [...prev, ...checkedItemsBackup])
        handleAuthError()
        return
      }

      if (!response.ok) {
        // Restore checked items on failure
        setItems(prev => [...prev, ...checkedItemsBackup])
        handleSyncError('Failed to clear checked items')
      }
    } catch {
      // Network error - restore checked items
      setItems(prev => [...prev, ...checkedItemsBackup])
      handleSyncError('Failed to clear checked items - check your connection')
    }
  }

  const uncheckedItems = items.filter((item) => !item.is_checked)
  const checkedItems = items.filter((item) => item.is_checked)

  return (
    <div className="space-y-4">
      {/* Sync Error Banner */}
      {syncError && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{syncError.message}</span>
          <button
            onClick={() => setSyncError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="space-y-2 relative z-10">
        <div className="flex gap-2">
          <Input
            placeholder="Add item..."
            value={newItemName}
            onChange={(e) => setNewItemName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Qty"
            value={newItemQuantity}
            onChange={(e) => setNewItemQuantity(e.target.value)}
            className="w-24"
          />
        </div>
        <div className="flex gap-2">
          <Select value={newItemCategory} onValueChange={setNewItemCategory}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Category (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No category</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.icon ? `${category.icon} ${category.name}` : category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button type="submit" size="sm" disabled={isAdding}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Items List - Lined Paper Style */}
      <div
        className="rounded-md -mx-2 px-4 min-h-[200px]"
        style={{
          backgroundColor: '#fefcf3',
          backgroundImage: `
            repeating-linear-gradient(
              transparent,
              transparent 47px,
              #e8d5b7 47px,
              #e8d5b7 48px
            )
          `,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.05)',
        }}
      >
        {items.length === 0 ? (
          <p className="py-8 text-center text-sm text-amber-700/60 italic">
            No items yet. Add your first item above!
          </p>
        ) : (
          <>
            {/* Unchecked Items */}
            {uncheckedItems.length > 0 && (
              <div>
                {uncheckedItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    categories={categories}
                    onToggle={handleToggleItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}

            {/* Checked Items */}
            {checkedItems.length > 0 && (
              <div>
                <div className="h-[48px] flex items-center pt-3 justify-between">
                  <p className="text-base text-amber-700/60 italic">Checked</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearChecked}
                    className="text-xs text-amber-700/60 hover:text-amber-800 hover:bg-amber-100/50 h-6"
                    disabled={false}
                  >
                    Clear All
                  </Button>
                </div>
                {checkedItems.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    categories={categories}
                    onToggle={handleToggleItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function ItemRow({
  item,
  categories,
  onToggle,
  onDelete,
}: {
  item: ListItem
  categories: Category[]
  onToggle: (id: string, currentState: boolean) => void
  onDelete: (id: string) => void
}) {
  const category = categories.find((c) => c.id === item.category_id)
  const isTemp = item.id.startsWith('temp-')

  return (
    <div
      className={`flex items-center gap-3 h-[48px] pt-3 transition-opacity ${
        item.is_checked ? 'opacity-50' : ''
      } ${isTemp ? 'opacity-60' : ''}`}
    >
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={() => onToggle(item.id, item.is_checked)}
        disabled={isTemp}
        className="h-5 w-5 border-amber-400 data-[state=checked]:bg-amber-600 data-[state=checked]:border-amber-600"
      />
      <div className="flex-1 min-w-0 flex items-baseline gap-2 overflow-hidden">
        <span
          className={`text-xl text-gray-800 truncate ${
            item.is_checked ? 'line-through text-gray-500' : ''
          }`}
          style={{ fontFamily: 'var(--font-caveat)', fontWeight: 500 }}
        >
          {item.name}
        </span>
        {item.quantity && (
          <span className="text-sm text-amber-700/70 flex-shrink-0">
            ({item.quantity})
          </span>
        )}
        {category && (
          <span
            className="text-sm px-2 py-0.5 rounded flex-shrink-0"
            style={{
              backgroundColor: category.color + '25',
              color: category.color,
            }}
          >
            {category.icon && <span className="mr-0.5">{category.icon}</span>}
            {category.name}
          </span>
        )}
        {item.notes && (
          <span className="text-sm text-amber-700/50 italic truncate flex-shrink">
            — {item.notes}
          </span>
        )}
      </div>
      {!isTemp && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(item.id)}
          className="h-8 w-8 p-0 hover:bg-amber-100/50 flex-shrink-0"
        >
          <Trash2 className="h-4 w-4 text-amber-700/40 hover:text-red-500" />
        </Button>
      )}
    </div>
  )
}
