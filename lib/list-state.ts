// Shared types and pure state-transition helpers for the dashboard's
// optimistic-update / refetch logic. Kept free of React and network code
// so they can be unit-tested directly.

export type GroceryList = {
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

export type ListItem = {
  id: string
  name: string
  quantity: string | null
  notes: string | null
  is_checked: boolean
  category_id: string | null
  list_id: string
}

export type Category = {
  id: string
  name: string
  color: string
  icon: string | null
}

/** Optimistically added items carry a temp id until the server confirms them. */
export function isTempId(id: string): boolean {
  return id.startsWith('temp-')
}

export function makeTempId(now: number): string {
  return `temp-${now}`
}

/**
 * Replace state with freshly fetched items, preserving optimistic temp items
 * that haven't been committed to the DB yet (a fetch snapshot taken before
 * the commit would otherwise make them vanish from the UI).
 */
export function mergeFetchedItems<T extends { id: string }>(
  prev: T[],
  fresh: T[]
): T[] {
  const pendingTemp = prev.filter((item) => isTempId(item.id))
  return pendingTemp.length ? [...pendingTemp, ...fresh] : fresh
}

/**
 * Swap an optimistic temp item for the server-confirmed one. If a refetch
 * already delivered the real item, drop the temp instead of creating a
 * duplicate id.
 */
export function resolveTempItem<T extends { id: string }>(
  prev: T[],
  tempId: string,
  realItem: T
): T[] {
  if (prev.some((item) => item.id === realItem.id)) {
    return prev.filter((item) => item.id !== tempId)
  }
  return prev.map((item) => (item.id === tempId ? realItem : item))
}

type ShareRow = {
  role: string
  grocery_lists: unknown
}

type GroceryListRow = Omit<GroceryList, 'myRole' | 'isOwner' | 'isShared'> & {
  updated_at: string
}

/**
 * Transform list_shares rows (joined with grocery_lists) into the UI's
 * GroceryList shape: active lists first, then newest first.
 */
export function transformShares(shares: ShareRow[] | null): GroceryList[] {
  return (
    shares
      ?.map((share) => {
        const listData = share.grocery_lists as GroceryListRow
        return {
          ...listData,
          myRole: share.role as 'owner' | 'editor',
          isOwner: share.role === 'owner',
          isShared: share.role !== 'owner',
        }
      })
      .sort((a, b) => {
        if (a.is_active !== b.is_active) return a.is_active ? -1 : 1
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }) || []
  )
}
