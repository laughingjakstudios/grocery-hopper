'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Trash2, Plus, AlertCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

type Category = {
  id: string
  name: string
  color: string
  icon: string | null
}

const PRESET_COLORS = [
  '#EF4444', // Red
  '#F59E0B', // Orange
  '#10B981', // Green
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#6B7280', // Gray
]

const PRESET_ICONS = ['🥬', '🥛', '🍖', '🍞', '🧀', '🍎', '🥫', '🧊', '🧴', '🍫']

export function CategoriesManager() {
  const router = useRouter()
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0])
  const [selectedIcon, setSelectedIcon] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
  }, [])

  async function fetchCategories() {
    const supabase = createClient()

    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name')

    if (error) {
      setError('Failed to load categories')
    }
    setCategories(data || [])
    setLoading(false)
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newName.trim() || isSubmitting) return

    setError(null)
    setIsSubmitting(true)

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName,
          color: selectedColor,
          icon: selectedIcon || null,
        }),
      })

      if (response.status === 401) {
        router.push('/login')
        return
      }

      if (!response.ok) {
        setError('Failed to create category')
        return
      }

      setNewName('')
      setSelectedIcon('')
      fetchCategories()
    } catch {
      setError('Failed to create category. Check your connection.')
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(categoryId: string) {
    if (confirm('Delete this category? Items will not be deleted.')) {
      try {
        const response = await fetch(`/api/categories?id=${categoryId}`, {
          method: 'DELETE',
        })

        if (response.status === 401) {
          router.push('/login')
          return
        }

        if (!response.ok) {
          setError('Failed to delete category')
          return
        }

        fetchCategories()
      } catch {
        setError('Failed to delete category. Check your connection.')
      }
    }
  }

  if (loading) {
    return <p className="text-sm text-gray-500">Loading categories...</p>
  }

  return (
    <div className="space-y-4">
      {/* Error Banner */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-500 hover:text-red-700"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Create New Category */}
      <Card className="p-4">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category_name">Category Name</Label>
            <Input
              id="category_name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="e.g., Produce, Dairy, Meat"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className={`h-8 w-8 rounded-full border-2 ${
                    selectedColor === color
                      ? 'border-gray-900'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Icon (Optional)</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_ICONS.map((icon) => (
                <button
                  key={icon}
                  type="button"
                  onClick={() => setSelectedIcon(icon)}
                  className={`rounded border-2 p-2 text-xl ${
                    selectedIcon === icon
                      ? 'border-gray-900 bg-gray-100'
                      : 'border-transparent'
                  }`}
                >
                  {icon}
                </button>
              ))}
            </div>
          </div>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <Plus className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Adding...' : 'Add Category'}
          </Button>
        </form>
      </Card>

      {/* Existing Categories */}
      <div className="space-y-2">
        <Label>Your Categories</Label>
        {categories.length === 0 ? (
          <p className="text-sm text-gray-500">
            No categories yet. Create your first one above!
          </p>
        ) : (
          <div className="grid gap-2">
            {categories.map((category) => (
              <Card key={category.id} className="flex items-center gap-3 p-3">
                <div
                  className="h-6 w-6 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                {category.icon && (
                  <span className="text-xl">{category.icon}</span>
                )}
                <span className="flex-1 font-medium">{category.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(category.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
