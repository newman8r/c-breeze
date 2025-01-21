-- Create invitations table
CREATE TABLE public.invitations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    organization_id uuid REFERENCES public.organizations(id) NOT NULL,
    invitee_email text NOT NULL,
    invitee_name text,
    role user_role NOT NULL,
    invited_by uuid REFERENCES auth.users(id) NOT NULL,
    is_accepted boolean DEFAULT false,
    is_invalidated boolean DEFAULT false,
    created_at timestamptz DEFAULT now() NOT NULL,
    accepted_at timestamptz,
    expires_at timestamptz DEFAULT (now() + interval '7 days') NOT NULL
);

-- Create indexes
CREATE INDEX invitations_organization_id_idx ON public.invitations(organization_id);
CREATE INDEX invitations_invitee_email_idx ON public.invitations(invitee_email);
CREATE INDEX invitations_invited_by_idx ON public.invitations(invited_by);

-- Enable RLS
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Organization admins can create invitations"
    ON public.invitations
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
            AND e.role = 'admin'
        )
    );

CREATE POLICY "Organization admins can manage invitations"
    ON public.invitations
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
            AND e.role = 'admin'
        )
    );

CREATE POLICY "Users can view their own invitations"
    ON public.invitations
    FOR SELECT
    USING (
        invitee_email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
        AND NOT is_invalidated
        AND NOT is_accepted
        AND expires_at > now()
    ); 