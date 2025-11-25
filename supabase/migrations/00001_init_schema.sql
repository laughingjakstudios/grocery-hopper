-- ============================================================================
-- GROCERYHOPPER - Initial Schema
-- ============================================================================
-- Tables:
--   1. profiles - User profiles (created during signup)
--   2. categories - Shopping categories (Produce, Dairy, Meat, etc.)
--   3. grocery_lists - Shopping lists
--   4. list_items - Items in each list
-- ============================================================================

-- ============================================================================
-- 1. PROFILES TABLE
-- ============================================================================
-- Stores user profile information
-- Linked to auth.users via id (UUID)
-- Created during signup using service role client

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT profiles_email_check CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- ============================================================================
-- 2. CATEGORIES TABLE
-- ============================================================================
-- Shopping categories for organizing grocery items
-- Each user can create their own categories

CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6B7280', -- Hex color code for UI display
  icon TEXT, -- Optional icon name/emoji
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- Ensure unique category names per user
  CONSTRAINT unique_category_per_user UNIQUE (user_id, name),
  CONSTRAINT categories_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Index for faster category queries
CREATE INDEX IF NOT EXISTS idx_categories_user_id ON public.categories(user_id);

-- ============================================================================
-- 3. GROCERY_LISTS TABLE
-- ============================================================================
-- Shopping lists that users create

CREATE TABLE IF NOT EXISTS public.grocery_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'My Grocery List',
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE, -- Active lists shown first
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT grocery_lists_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_grocery_lists_user_id ON public.grocery_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_grocery_lists_is_active ON public.grocery_lists(is_active);

-- ============================================================================
-- 4. LIST_ITEMS TABLE
-- ============================================================================
-- Individual items in a grocery list

CREATE TABLE IF NOT EXISTS public.list_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  quantity TEXT, -- e.g., "2 lbs", "1 gallon", "5 items"
  notes TEXT,
  is_checked BOOLEAN DEFAULT FALSE,
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  list_id UUID NOT NULL REFERENCES public.grocery_lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  CONSTRAINT list_items_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_list_items_list_id ON public.list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_list_items_user_id ON public.list_items(user_id);
CREATE INDEX IF NOT EXISTS idx_list_items_category_id ON public.list_items(category_id);
CREATE INDEX IF NOT EXISTS idx_list_items_is_checked ON public.list_items(is_checked);

-- ============================================================================
-- UPDATED_AT TRIGGERS
-- ============================================================================
-- Automatically update updated_at timestamp on row changes

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.grocery_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.list_items
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
