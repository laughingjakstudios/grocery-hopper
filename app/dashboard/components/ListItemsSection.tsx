'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2 } from 'lucide-react'

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

export function ListItemsSection({
  listId,
  items,
  categories,
  onItemsChange,
}: {
  listId: string
  items: ListItem[]
  categories: Category[]
  onItemsChange: () => void
}) {
  const [newItemName, setNewItemName] = useState('')
  const [newItemQuantity, setNewItemQuantity] = useState('')
  const [newItemCategory, setNewItemCategory] = useState('')

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault()
    if (!newItemName.trim()) return

    const response = await fetch('/api/items', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newItemName,
        quantity: newItemQuantity || null,
        category_id: newItemCategory === 'none' ? null : newItemCategory || null,
        list_id: listId,
      }),
    })

    if (response.ok) {
      setNewItemName('')
      setNewItemQuantity('')
      setNewItemCategory('')
      onItemsChange()
    }
  }

  async function handleToggleItem(itemId: string, currentState: boolean) {
    const response = await fetch('/api/items', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: itemId,
        is_checked: !currentState,
      }),
    })

    if (response.ok) {
      onItemsChange()
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (confirm('Delete this item?')) {
      const response = await fetch(`/api/items?id=${itemId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onItemsChange()
      }
    }
  }

  async function handleClearChecked() {
    if (confirm('Clear all checked items?')) {
      const response = await fetch(`/api/items/clear?listId=${listId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onItemsChange()
      }
    }
  }

  const uncheckedItems = items.filter((item) => !item.is_checked)
  const checkedItems = items.filter((item) => item.is_checked)

  return (
    <div className="space-y-4">
      {/* Add Item Form */}
      <form onSubmit={handleAddItem} className="space-y-2">
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
          <Button type="submit" size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </form>

      {/* Items List */}
      {items.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-500">
          No items yet. Add your first item above!
        </p>
      ) : (
        <>
          {/* Unchecked Items */}
          {uncheckedItems.length > 0 && (
            <div className="space-y-2">
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
            <div className="space-y-2 border-t pt-2">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">Checked Items</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearChecked}
                  className="text-xs"
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

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border p-2 ${
        item.is_checked ? 'bg-gray-50 opacity-60' : 'bg-white'
      }`}
    >
      <Checkbox
        checked={item.is_checked}
        onCheckedChange={() => onToggle(item.id, item.is_checked)}
      />
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span
            className={`font-medium ${
              item.is_checked ? 'line-through text-gray-500' : ''
            }`}
          >
            {item.name}
          </span>
          {item.quantity && (
            <Badge variant="outline" className="text-xs">
              {item.quantity}
            </Badge>
          )}
          {category && (
            <Badge
              variant="secondary"
              className="text-xs"
              style={{
                backgroundColor: category.color + '20',
                color: category.color,
              }}
            >
              {category.icon && <span className="mr-1">{category.icon}</span>}
              {category.name}
            </Badge>
          )}
        </div>
        {item.notes && (
          <p className="text-xs text-gray-500">{item.notes}</p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onDelete(item.id)}
      >
        <Trash2 className="h-4 w-4 text-gray-400" />
      </Button>
    </div>
  )
}
