/**
 * @description Adds a slug field to organizations for customer portal URLs
 * @schema public
 * @version 1.0.0
 * @date 2024-01-28
 */

-- Add slug column
ALTER TABLE public.organizations
ADD COLUMN slug text;

-- Create unique index for slug
CREATE UNIQUE INDEX organizations_slug_idx ON public.organizations(slug);

-- Add not null constraint after manual data population
-- This is commented out initially to allow manual population of existing records
-- ALTER TABLE public.organizations ALTER COLUMN slug SET NOT NULL;

-- Add comment
COMMENT ON COLUMN public.organizations.slug IS 'URL-friendly identifier for the organization''s customer portal';

-- Update RLS policies to allow reading by slug
CREATE POLICY "Allow public read access to organization by slug" ON public.organizations
    FOR SELECT
    TO public
    USING (true);  -- We want this readable by anyone for the customer portal 