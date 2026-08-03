'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Category, ListItem } from '@/lib/list-state'

export type ItemEdits = {
  name: string
  quantity: string | null
  notes: string | null
  category_id: string | null
}

export function EditItemDialog({
  item,
  categories,
  onClose,
  onSave,
}: {
  item: ListItem | null
  categories: Category[]
  onClose: () => void
  onSave: (id: string, edits: ItemEdits) => Promise<boolean>
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [quantity, setQuantity] = useState(item?.quantity ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [categoryId, setCategoryId] = useState(item?.category_id ?? 'none')
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!item || !name.trim() || saving) return

    setSaving(true)
    const success = await onSave(item.id, {
      name: name.trim(),
      quantity: quantity.trim() || null,
      notes: notes.trim() || null,
      category_id: categoryId === 'none' ? null : categoryId,
    })
    setSaving(false)
    if (success) onClose()
  }

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>Update the details for this item</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-item-name">Name</Label>
            <Input
              id="edit-item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-item-quantity">Quantity</Label>
            <Input
              id="edit-item-quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2 lbs"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-item-category">Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger id="edit-item-category">
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
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-item-notes">Notes</Label>
            <Textarea
              id="edit-item-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
