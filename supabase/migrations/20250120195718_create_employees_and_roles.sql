-- Create enum for user roles
CREATE TYPE public.user_role AS ENUM ('customer', 'employee', 'admin');

-- Create employees table
CREATE TABLE public.employees (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) NOT NULL,
    role user_role NOT NULL,
    is_root_admin boolean DEFAULT false,
    name text,
    email text NOT NULL,
    status text DEFAULT 'active',
    skills jsonb DEFAULT '[]'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    last_login_at timestamptz,
    UNIQUE(user_id, organization_id)
);

-- Create index for faster lookups
CREATE INDEX employees_user_id_idx ON public.employees(user_id);
CREATE INDEX employees_organization_id_idx ON public.employees(organization_id);

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Allow users to view their own employee record and other employees in their organization
CREATE POLICY "Users can view employees in their organization"
    ON public.employees
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees AS e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = employees.organization_id
        )
    );

-- Allow organization admins to create/update/delete employee records
CREATE POLICY "Admins can manage employees"
    ON public.employees
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.employees AS e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = employees.organization_id
            AND e.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees AS e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = employees.organization_id
            AND e.role = 'admin'
            -- Prevent non-root admins from modifying root admins
            AND (NOT employees.is_root_admin OR e.is_root_admin)
        )
    );

-- Function to get current user's role
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TABLE (
    role user_role,
    is_root_admin boolean,
    organization_id uuid
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    RETURN QUERY
    SELECT e.role, e.is_root_admin, e.organization_id
    FROM public.employees e
    WHERE e.user_id = auth.uid()
    LIMIT 1;
END;
$$;

-- Function to create initial admin user for an organization
CREATE OR REPLACE FUNCTION public.create_initial_admin(
    org_id uuid,
    admin_user_id uuid,
    admin_email text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    employee_id uuid;
BEGIN
    -- Create the employee record with admin role and root admin status
    INSERT INTO public.employees (
        user_id,
        organization_id,
        role,
        is_root_admin,
        email,
        status
    )
    VALUES (
        admin_user_id,
        org_id,
        'admin',
        true,
        admin_email,
        'active'
    )
    RETURNING id INTO employee_id;

    RETURN employee_id;
END;
$$;

-- Modify the registration process to automatically create admin
CREATE OR REPLACE FUNCTION public.handle_new_organization_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- When a new organization is created, set up the creator as root admin
    PERFORM public.create_initial_admin(
        NEW.id,
        NEW.created_by,
        (NEW.contact_info->>'email')::text
    );
    
    RETURN NEW;
END;
$$;

-- Create trigger to handle new organization creation
CREATE TRIGGER on_organization_created
    AFTER INSERT ON public.organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_organization_user();
