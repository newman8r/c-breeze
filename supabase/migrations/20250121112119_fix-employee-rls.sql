-- First clean up the old users table and its dependencies
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop existing policies and functions
DROP FUNCTION IF EXISTS check_organization_access(uuid, uuid);
DROP FUNCTION IF EXISTS is_organization_member(uuid, uuid);
DROP FUNCTION IF EXISTS check_org_membership(uuid, uuid);
DROP FUNCTION IF EXISTS is_org_member(uuid, uuid);
DROP FUNCTION IF EXISTS is_org_admin(uuid, uuid);
DROP FUNCTION IF EXISTS is_organization_owner(uuid, uuid);

-- Create helper functions that bypass RLS
CREATE OR REPLACE FUNCTION get_user_organizations(_user_id uuid)
RETURNS TABLE (org_id uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    -- Get organizations user has created
    SELECT id FROM organizations WHERE created_by = _user_id
    UNION
    -- Get organizations user is an employee of
    SELECT DISTINCT organization_id FROM employees WHERE user_id = _user_id;
$$;

CREATE OR REPLACE FUNCTION get_user_role(_user_id uuid, _org_id uuid)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT role FROM employees 
    WHERE user_id = _user_id 
    AND organization_id = _org_id;
$$;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can view employees in their organization" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage employees" ON public.employees;
DROP POLICY IF EXISTS "Allow users to view their own employee record" ON public.employees;
DROP POLICY IF EXISTS "Allow users to view employees in their organizations" ON public.employees;
DROP POLICY IF EXISTS "Allow admins to manage employees in their organization" ON public.employees;
DROP POLICY IF EXISTS "Users can view their own employee record" ON public.employees;
DROP POLICY IF EXISTS "Users can view employees in same organization" ON public.employees;
DROP POLICY IF EXISTS "Admins can manage organization employees" ON public.employees;
DROP POLICY IF EXISTS "view_own_record" ON public.employees;
DROP POLICY IF EXISTS "view_organization_employees" ON public.employees;
DROP POLICY IF EXISTS "admin_manage_employees" ON public.employees;
DROP POLICY IF EXISTS "test_basic_access" ON public.employees;
DROP POLICY IF EXISTS "employee_self_access" ON public.employees;
DROP POLICY IF EXISTS "employee_select" ON public.employees;
DROP POLICY IF EXISTS "employee_write" ON public.employees;
DROP POLICY IF EXISTS "organization_access" ON public.organizations;
DROP POLICY IF EXISTS "organization_owner_access" ON public.organizations;
DROP POLICY IF EXISTS "organization_member_access" ON public.organizations;
DROP POLICY IF EXISTS "employee_org_owner_access" ON public.employees;
DROP POLICY IF EXISTS "employee_admin_access" ON public.employees;
DROP POLICY IF EXISTS "employee_member_view" ON public.employees;

-- Enable RLS
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

-- Organization policies
CREATE POLICY "organization_access"
    ON public.organizations
    FOR ALL
    USING (
        id IN (SELECT org_id FROM get_user_organizations(auth.uid()))
    );

-- Employee policies
CREATE POLICY "employee_select"
    ON public.employees
    FOR SELECT
    USING (
        -- Can view own record
        user_id = auth.uid()
        OR
        -- Can view records in organizations they belong to
        organization_id IN (SELECT org_id FROM get_user_organizations(auth.uid()))
    );

CREATE POLICY "employee_write"
    ON public.employees
    FOR INSERT
    WITH CHECK (
        -- Can only insert into organizations they own or where they are admin
        organization_id IN (SELECT org_id FROM get_user_organizations(auth.uid()))
        AND
        get_user_role(auth.uid(), organization_id) = 'admin'
    );

CREATE POLICY "employee_modify"
    ON public.employees
    FOR UPDATE
    USING (
        -- Can modify own record
        user_id = auth.uid()
        OR
        -- Can modify if admin in organization
        (
            organization_id IN (SELECT org_id FROM get_user_organizations(auth.uid()))
            AND
            get_user_role(auth.uid(), organization_id) = 'admin'
            AND
            -- Don't allow non-root admins to modify root admins
            (
                NOT employees.is_root_admin 
                OR 
                (SELECT is_root_admin FROM employees WHERE user_id = auth.uid() AND organization_id = employees.organization_id)
            )
        )
    );

CREATE POLICY "employee_delete"
    ON public.employees
    FOR DELETE
    USING (
        -- Can't delete own record
        user_id != auth.uid()
        AND
        -- Can delete if admin in organization
        organization_id IN (SELECT org_id FROM get_user_organizations(auth.uid()))
        AND
        get_user_role(auth.uid(), organization_id) = 'admin'
        AND
        -- Don't allow non-root admins to delete root admins
        (
            NOT employees.is_root_admin 
            OR 
            (SELECT is_root_admin FROM employees WHERE user_id = auth.uid() AND organization_id = employees.organization_id)
        )
    );

-- Grant necessary permissions
GRANT ALL ON public.organizations TO authenticated;
GRANT ALL ON public.employees TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_organizations TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_role TO authenticated;
