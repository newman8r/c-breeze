-- Drop the existing policy
DROP POLICY IF EXISTS "Users can view their own invitations" ON public.invitations;

-- Create a new policy that allows viewing invitations by ID without authentication
CREATE POLICY "Anyone can view invitations by ID"
    ON public.invitations
    FOR SELECT
    USING (
        NOT is_invalidated
        AND NOT is_accepted
        AND expires_at > now()
    );

-- Keep the admin policies
CREATE POLICY "Organization admins can view all invitations"
    ON public.invitations
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
            AND e.role = 'admin'
        )
    ); 