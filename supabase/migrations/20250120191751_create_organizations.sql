-- Create organizations table
CREATE TABLE public.organizations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    name text NOT NULL,
    contact_info jsonb NOT NULL DEFAULT '{}'::jsonb,
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_by uuid REFERENCES auth.users(id) NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL
);

-- Create index for faster lookups
CREATE INDEX organizations_created_by_idx ON public.organizations(created_by);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to create their own organization
CREATE POLICY "Users can create their own organization"
    ON public.organizations
    FOR INSERT
    WITH CHECK (auth.uid() = created_by);

-- Allow users to view their own organization
CREATE POLICY "Users can view their own organization"
    ON public.organizations
    FOR SELECT
    USING (auth.uid() = created_by);

-- Allow users to update their own organization
CREATE POLICY "Users can update their own organization"
    ON public.organizations
    FOR UPDATE
    USING (auth.uid() = created_by)
    WITH CHECK (auth.uid() = created_by);

-- Allow users to delete their own organization
CREATE POLICY "Users can delete their own organization"
    ON public.organizations
    FOR DELETE
    USING (auth.uid() = created_by);

-- Create a function to get the current user's organization
CREATE OR REPLACE FUNCTION public.get_current_user_organization()
RETURNS SETOF organizations
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT *
    FROM public.organizations
    WHERE created_by = auth.uid()
    LIMIT 1;
$$;
