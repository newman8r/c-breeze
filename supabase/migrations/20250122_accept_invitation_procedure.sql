-- Create a function to handle invitation acceptance
CREATE OR REPLACE FUNCTION public.accept_invitation(
    _invitation_id uuid,
    _user_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    _invitation record;
BEGIN
    -- Get the invitation in a FOR UPDATE lock
    SELECT * INTO _invitation 
    FROM public.invitations 
    WHERE id = _invitation_id
    FOR UPDATE;

    -- Verify invitation exists and is valid
    IF _invitation IS NULL THEN
        RAISE EXCEPTION 'Invalid invitation';
    END IF;

    IF _invitation.is_accepted OR 
       _invitation.is_invalidated OR 
       _invitation.expires_at < NOW() THEN
        RAISE EXCEPTION 'Invitation is no longer valid';
    END IF;

    -- Create the employee record
    INSERT INTO public.employees (
        user_id,
        organization_id,
        role,
        email,
        status
    ) VALUES (
        _user_id,
        _invitation.organization_id,
        _invitation.role,
        _invitation.invitee_email,
        'active'
    );

    -- Mark the invitation as accepted
    UPDATE public.invitations
    SET 
        is_accepted = true,
        accepted_at = NOW()
    WHERE id = _invitation_id;

    -- Return success
    RETURN;
END;
$$; 