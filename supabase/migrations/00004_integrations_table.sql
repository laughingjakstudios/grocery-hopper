-- ============================================================================
-- INTEGRATIONS TABLE - Google Keep Sync & Other Third-Party Services
-- ============================================================================
-- Stores encrypted credentials and settings for third-party integrations
-- Currently supports: Google Keep (via gkeepapi)
-- Future: Alexa, IFTTT, etc.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_keep', 'alexa', 'ifttt')),

  -- Encrypted credentials (use pgsodium for encryption in production)
  -- For Google Keep: stores email and app-specific password or master token
  credentials JSONB NOT NULL, -- { "email": "...", "password": "...", "master_token": "..." }

  -- Integration state
  is_enabled BOOLEAN DEFAULT TRUE,
  last_sync_at TIMESTAMPTZ,
  last_sync_status TEXT, -- 'success', 'error', 'pending'
  last_sync_error TEXT,

  -- Provider-specific settings
  settings JSONB DEFAULT '{}'::jsonb, -- { "keep_list_name": "Shopping List", "sync_interval_minutes": 2 }

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- One integration per provider per user
  CONSTRAINT unique_provider_per_user UNIQUE (user_id, provider)
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_integrations_user_id ON public.integrations(user_id);
CREATE INDEX IF NOT EXISTS idx_integrations_enabled ON public.integrations(is_enabled) WHERE is_enabled = TRUE;

-- RLS Policies
ALTER TABLE public.integrations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own integrations"
  ON public.integrations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own integrations"
  ON public.integrations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.integrations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON public.integrations FOR DELETE
  USING (auth.uid() = user_id);

-- Updated_at trigger
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================================
-- SECURITY NOTES
-- ============================================================================
--
-- ⚠️ IMPORTANT: Credentials are stored as JSONB in plain text in this migration.
-- For production, you should:
--
-- 1. Use Supabase Vault or pgsodium for encryption at rest
-- 2. Encrypt credentials before storing them
-- 3. Never log credentials
-- 4. Rotate credentials if compromised
--
-- Google Keep Integration Credentials:
-- - email: User's Google account email
-- - password: App-specific password (recommended) or account password
-- - master_token: Alternative to password (generated via gpsoauth)
--
-- Why we need credentials (not OAuth):
-- - gkeepapi is unofficial and doesn't support OAuth
-- - Google Keep API is enterprise-only (Workspace accounts)
-- - This is the only way to access Keep for consumer accounts
--
-- ============================================================================
