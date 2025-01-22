-- Update the accept_invitation procedure to handle first and last names
CREATE OR REPLACE FUNCTION public.accept_invitation(_invitation_id uuid, _user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    _invitation record;
    _user_metadata jsonb;
BEGIN
    -- Get user metadata
    SELECT raw_user_meta_data INTO _user_metadata
    FROM auth.users
    WHERE id = _user_id;

    -- Get and lock the invitation
    SELECT * INTO _invitation
    FROM public.invitations
    WHERE id = _invitation_id
    FOR UPDATE;

    -- Verify invitation exists and is valid
    IF NOT FOUND OR _invitation.is_accepted OR _invitation.is_invalidated OR _invitation.expires_at < now() THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;

    -- Create employee record
    INSERT INTO public.employees (
        user_id,
        organization_id,
        role,
        email,
        first_name,
        last_name,
        status
    ) VALUES (
        _user_id,
        _invitation.organization_id,
        _invitation.role,
        _invitation.invitee_email,
        _user_metadata->>'first_name',
        _user_metadata->>'last_name',
        'active'
    );

    -- Mark invitation as accepted
    UPDATE public.invitations
    SET is_accepted = true,
        accepted_at = now()
    WHERE id = _invitation_id;

EXCEPTION 
    WHEN OTHERS THEN
        RAISE;
END;
$$; 