-- ============================================================================
-- GROCERYHOPPER - Shared Lists Feature
-- ============================================================================
-- This migration adds:
--   1. list_shares table - Track who has access to which lists
--   2. share_code column on grocery_lists - For link-based sharing
--   3. Migrate categories from user-level to list-level
--   4. Update RLS policies for shared access
-- ============================================================================

-- ============================================================================
-- 1. ADD SHARE_CODE TO GROCERY_LISTS
-- ============================================================================
-- Unique code for link-based sharing (e.g., "abc123xyz789")

ALTER TABLE public.grocery_lists
ADD COLUMN IF NOT EXISTS share_code VARCHAR(12) UNIQUE;

-- Index for fast lookups when joining via link
CREATE INDEX IF NOT EXISTS idx_grocery_lists_share_code
ON public.grocery_lists(share_code) WHERE share_code IS NOT NULL;

-- ============================================================================
-- 2. CREATE LIST_SHARES TABLE
-- ============================================================================
-- Tracks which users have access to which lists and their role

CREATE TABLE IF NOT EXISTS public.list_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id UUID NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor')),
  joined_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Each user can only have one role per list
  CONSTRAINT unique_list_share UNIQUE (list_id, user_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_list_shares_list_id ON public.list_shares(list_id);
CREATE INDEX IF NOT EXISTS idx_list_shares_user_id ON public.list_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_list_shares_role ON public.list_shares(role);

-- ============================================================================
-- 3. MIGRATE CATEGORIES TO LIST-LEVEL
-- ============================================================================
-- Categories will now belong to lists instead of users
-- This enables shared categories for collaborative lists

-- Step 3a: Add list_id column (nullable initially for migration)
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES public.grocery_lists(id) ON DELETE CASCADE;

-- Step 3b: Create index for list-based category queries
CREATE INDEX IF NOT EXISTS idx_categories_list_id ON public.categories(list_id);

-- ============================================================================
-- 4. DATA MIGRATION
-- ============================================================================
-- Migrate existing data to the new schema

-- Step 4a: Create list_shares entries for all existing lists (owners)
INSERT INTO public.list_shares (list_id, user_id, role, joined_at)
SELECT id, user_id, 'owner', created_at
FROM public.grocery_lists
ON CONFLICT (list_id, user_id) DO NOTHING;

-- Step 4b: Migrate categories to list-level
-- For each user's categories, assign them to their first active list
-- If user has no lists, categories will be orphaned (list_id = NULL)
-- and can be cleaned up or assigned when they create a list

-- First, for users with lists, assign categories to their first list
UPDATE public.categories c
SET list_id = (
  SELECT gl.id
  FROM public.grocery_lists gl
  WHERE gl.user_id = c.user_id
  ORDER BY gl.is_active DESC, gl.created_at ASC
  LIMIT 1
)
WHERE c.list_id IS NULL;

-- Step 4c: Update list_items to reference new list-level categories
-- Items already have list_id, so we need to ensure their category
-- belongs to the same list. For now, categories are assigned to
-- the user's first list, so items on other lists may have mismatched
-- categories. We'll handle this by allowing NULL category_id.

-- For items whose category doesn't match their list, clear the category
UPDATE public.list_items li
SET category_id = NULL
WHERE category_id IS NOT NULL
AND NOT EXISTS (
  SELECT 1 FROM public.categories c
  WHERE c.id = li.category_id
  AND c.list_id = li.list_id
);

-- ============================================================================
-- 5. UPDATE CONSTRAINTS
-- ============================================================================

-- Drop old unique constraint on categories (user_id, name)
ALTER TABLE public.categories
DROP CONSTRAINT IF EXISTS unique_category_per_user;

-- Add new unique constraint (list_id, name) - categories unique per list
-- Only apply to categories that have a list_id
ALTER TABLE public.categories
ADD CONSTRAINT unique_category_per_list UNIQUE (list_id, name);

-- ============================================================================
-- 6. RLS POLICIES FOR LIST_SHARES
-- ============================================================================

ALTER TABLE public.list_shares ENABLE ROW LEVEL SECURITY;

-- Users can view shares for lists they have access to
CREATE POLICY "Users can view list shares they belong to"
  ON public.list_shares FOR SELECT
  USING (auth.uid() = user_id);

-- Only list owners can add new shares (handled in app code, but backup policy)
CREATE POLICY "Users can insert own share entry"
  ON public.list_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can delete their own share (leave a list)
CREATE POLICY "Users can delete own share"
  ON public.list_shares FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- 7. UPDATE EXISTING RLS POLICIES
-- ============================================================================

-- Update grocery_lists policies to include shared lists
DROP POLICY IF EXISTS "Users can view own lists" ON public.grocery_lists;
CREATE POLICY "Users can view accessible lists"
  ON public.grocery_lists FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.list_shares ls
      WHERE ls.list_id = id AND ls.user_id = auth.uid()
    )
  );

-- Keep other grocery_lists policies as owner-only (create, update, delete)
-- Editors can modify items but not the list itself

-- Update list_items policies for shared access
DROP POLICY IF EXISTS "Users can view own list items" ON public.list_items;
CREATE POLICY "Users can view accessible list items"
  ON public.list_items FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.list_shares ls
      WHERE ls.list_id = list_id AND ls.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own list items" ON public.list_items;
CREATE POLICY "Users can create items in accessible lists"
  ON public.list_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.list_shares ls
      WHERE ls.list_id = list_id AND ls.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own list items" ON public.list_items;
CREATE POLICY "Users can update items in accessible lists"
  ON public.list_items FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.list_shares ls
      WHERE ls.list_id = list_id AND ls.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own list items" ON public.list_items;
CREATE POLICY "Users can delete items in accessible lists"
  ON public.list_items FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.list_shares ls
      WHERE ls.list_id = list_id AND ls.user_id = auth.uid()
    )
  );

-- Update categories policies for list-level access
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
CREATE POLICY "Users can view categories for accessible lists"
  ON public.categories FOR SELECT
  USING (
    auth.uid() = user_id  -- Legacy: user's own categories
    OR EXISTS (
      SELECT 1 FROM public.list_shares ls
      WHERE ls.list_id = list_id AND ls.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create own categories" ON public.categories;
CREATE POLICY "Users can create categories in accessible lists"
  ON public.categories FOR INSERT
  WITH CHECK (
    list_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.list_shares ls
      WHERE ls.list_id = list_id AND ls.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
CREATE POLICY "Users can update categories in accessible lists"
  ON public.categories FOR UPDATE
  USING (
    auth.uid() = user_id  -- Legacy
    OR EXISTS (
      SELECT 1 FROM public.list_shares ls
      WHERE ls.list_id = list_id AND ls.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
CREATE POLICY "Users can delete categories in accessible lists"
  ON public.categories FOR DELETE
  USING (
    auth.uid() = user_id  -- Legacy
    OR (
      list_id IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.list_shares ls
        WHERE ls.list_id = list_id AND ls.user_id = auth.uid() AND ls.role = 'owner'
      )
    )
  );

-- ============================================================================
-- 8. HELPER FUNCTION FOR GENERATING SHARE CODES
-- ============================================================================

CREATE OR REPLACE FUNCTION public.generate_share_code()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..12 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- NOTES
-- ============================================================================
--
-- After this migration:
-- - All existing lists have their owner in list_shares with role='owner'
-- - Categories are now associated with lists (via list_id)
-- - Users can share lists via share_code (generated in app)
-- - Editors can add/edit/delete items and categories
-- - Only owners can delete lists or manage shares
--
-- App code changes needed:
-- - Generate share_code when user clicks "Share"
-- - Join list: lookup by share_code, add to list_shares
-- - Query lists: include shared lists via list_shares join
-- - Create list: also create list_shares entry with role='owner'
-- ============================================================================
