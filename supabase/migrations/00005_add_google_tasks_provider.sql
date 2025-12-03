-- Add google_tasks to the provider constraint
ALTER TABLE public.integrations DROP CONSTRAINT IF EXISTS integrations_provider_check;

ALTER TABLE public.integrations ADD CONSTRAINT integrations_provider_check
  CHECK (provider IN ('google_keep', 'google_tasks', 'alexa', 'ifttt'));
