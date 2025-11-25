-- ============================================================================
-- GROCERYHOPPER - Row Level Security (RLS) Policies
-- ============================================================================
-- Following DevHub best practices:
-- ✅ Keep policies SIMPLE - check only direct columns
-- ✅ NO circular references (causes infinite recursion)
-- ✅ NO complex joins or subqueries in policies
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_items ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- Note: INSERT is handled by service role client during signup
-- Note: DELETE cascade from auth.users handles account deletion

-- ============================================================================
-- CATEGORIES TABLE POLICIES
-- ============================================================================

-- Users can view their own categories
CREATE POLICY "Users can view own categories"
  ON public.categories FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own categories
CREATE POLICY "Users can create own categories"
  ON public.categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own categories
CREATE POLICY "Users can update own categories"
  ON public.categories FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own categories
CREATE POLICY "Users can delete own categories"
  ON public.categories FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- GROCERY_LISTS TABLE POLICIES
-- ============================================================================

-- Users can view their own lists
CREATE POLICY "Users can view own lists"
  ON public.grocery_lists FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own lists
CREATE POLICY "Users can create own lists"
  ON public.grocery_lists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own lists
CREATE POLICY "Users can update own lists"
  ON public.grocery_lists FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own lists
CREATE POLICY "Users can delete own lists"
  ON public.grocery_lists FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- LIST_ITEMS TABLE POLICIES
-- ============================================================================

-- Users can view their own list items
CREATE POLICY "Users can view own list items"
  ON public.list_items FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own list items
CREATE POLICY "Users can create own list items"
  ON public.list_items FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own list items
CREATE POLICY "Users can update own list items"
  ON public.list_items FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own list items
CREATE POLICY "Users can delete own list items"
  ON public.list_items FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
--
-- ✅ All policies check ONLY direct columns (user_id = auth.uid())
-- ✅ NO subqueries that could cause circular references
-- ✅ NO joins with other tables in policy conditions
--
-- Future considerations for list sharing:
-- - Add a separate "list_shares" table
-- - Handle sharing logic in application code, not RLS
-- - OR use a simple shared_with_user_ids array column
--
-- Why this approach?
-- - RLS recursion is a common pitfall (see DevHub docs/rls-anti-patterns.md)
-- - Complex authorization logic belongs in application code
-- - Simple policies are faster and more maintainable
-- ============================================================================
