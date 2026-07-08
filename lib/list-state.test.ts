import { describe, expect, it } from 'vitest'
import {
  isTempId,
  makeTempId,
  mergeFetchedItems,
  resolveTempItem,
  transformShares,
} from './list-state'

const item = (id: string, name = id) => ({ id, name })

describe('isTempId / makeTempId', () => {
  it('recognizes ids created by makeTempId', () => {
    expect(isTempId(makeTempId(1234))).toBe(true)
  })

  it('rejects real ids', () => {
    expect(isTempId('a1b2c3')).toBe(false)
  })
})

describe('mergeFetchedItems', () => {
  it('replaces state with fetched items', () => {
    const prev = [item('a'), item('b')]
    const fresh = [item('b'), item('c')]
    expect(mergeFetchedItems(prev, fresh)).toEqual(fresh)
  })

  it('preserves uncommitted temp items ahead of fetched items', () => {
    const temp = item('temp-1')
    const prev = [temp, item('a')]
    const fresh = [item('a'), item('b')]
    expect(mergeFetchedItems(prev, fresh)).toEqual([temp, ...fresh])
  })

  it('drops items deleted elsewhere', () => {
    const prev = [item('a'), item('b')]
    expect(mergeFetchedItems(prev, [item('a')])).toEqual([item('a')])
  })

  it('handles an empty fetch result', () => {
    const temp = item('temp-1')
    expect(mergeFetchedItems([temp, item('a')], [])).toEqual([temp])
  })
})

describe('resolveTempItem', () => {
  it('swaps the temp item for the confirmed one in place', () => {
    const prev = [item('temp-1'), item('a')]
    const real = item('real-1')
    expect(resolveTempItem(prev, 'temp-1', real)).toEqual([real, item('a')])
  })

  it('drops the temp item when a refetch already delivered the real one', () => {
    const real = item('real-1')
    const prev = [item('temp-1'), real, item('a')]
    expect(resolveTempItem(prev, 'temp-1', real)).toEqual([real, item('a')])
  })

  it('leaves state unchanged when the temp item is already gone', () => {
    const prev = [item('a')]
    expect(resolveTempItem(prev, 'temp-1', item('real-1'))).toEqual([item('a')])
  })
})

describe('transformShares', () => {
  const listRow = (
    id: string,
    created_at: string,
    is_active = true
  ) => ({
    id,
    name: `List ${id}`,
    description: null,
    is_active,
    share_code: null,
    user_id: 'owner-1',
    created_at,
    updated_at: created_at,
  })

  it('returns an empty array for null input', () => {
    expect(transformShares(null)).toEqual([])
  })

  it('flags ownership based on the share role', () => {
    const [owned, shared] = transformShares([
      { role: 'owner', grocery_lists: listRow('a', '2026-01-02') },
      { role: 'editor', grocery_lists: listRow('b', '2026-01-01') },
    ])
    expect(owned).toMatchObject({ id: 'a', isOwner: true, isShared: false, myRole: 'owner' })
    expect(shared).toMatchObject({ id: 'b', isOwner: false, isShared: true, myRole: 'editor' })
  })

  it('sorts active lists first, then newest first', () => {
    const result = transformShares([
      { role: 'owner', grocery_lists: listRow('archived-new', '2026-01-05', false) },
      { role: 'owner', grocery_lists: listRow('old', '2026-01-01') },
      { role: 'owner', grocery_lists: listRow('new', '2026-01-03') },
    ])
    expect(result.map((l) => l.id)).toEqual(['new', 'old', 'archived-new'])
  })
})
