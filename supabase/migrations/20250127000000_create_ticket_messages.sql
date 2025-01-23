/**
 * @description Creates ticket messages table for storing all communications related to tickets
 * @schema public
 * @version 1.0.0
 * @date 2024-01-27
 */

-- Create enum for message origins
CREATE TYPE public.message_origin AS ENUM (
    'ticket',
    'email',
    'chat',
    'sms',
    'phone',
    'api',
    'other'
);

-- Create enum for message sender type
CREATE TYPE public.message_sender_type AS ENUM (
    'employee',
    'customer',
    'system',
    'ai'
);

-- Create ticket messages table
CREATE TABLE public.ticket_messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    ticket_id uuid REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
    organization_id uuid REFERENCES public.organizations(id) NOT NULL,
    sender_id uuid REFERENCES auth.users(id),
    sender_type message_sender_type NOT NULL,
    content text NOT NULL,
    responding_to_id uuid REFERENCES public.ticket_messages(id),
    origin message_origin NOT NULL DEFAULT 'ticket',
    is_private boolean DEFAULT false,
    is_ai_generated boolean DEFAULT false,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    deleted_at timestamptz,
    -- Add constraints
    CONSTRAINT valid_response_thread CHECK (
        (responding_to_id IS NULL) OR 
        (responding_to_id != id)  -- Prevent self-referencing
    )
);

-- Create indexes
CREATE INDEX ticket_messages_ticket_id_idx ON public.ticket_messages(ticket_id);
CREATE INDEX ticket_messages_organization_id_idx ON public.ticket_messages(organization_id);
CREATE INDEX ticket_messages_sender_id_idx ON public.ticket_messages(sender_id);
CREATE INDEX ticket_messages_responding_to_id_idx ON public.ticket_messages(responding_to_id);
CREATE INDEX ticket_messages_created_at_idx ON public.ticket_messages(created_at);
CREATE INDEX ticket_messages_origin_idx ON public.ticket_messages(origin);
CREATE INDEX ticket_messages_sender_type_idx ON public.ticket_messages(sender_type);

-- Add GiST index for full-text search on content
CREATE INDEX ticket_messages_content_search_idx ON public.ticket_messages USING gin(to_tsvector('english', content));

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Create RLS policies

-- View policy: Users can view messages for tickets in their organization
CREATE POLICY "Users can view messages in their organization"
    ON public.ticket_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = ticket_messages.organization_id
        )
    );

-- Insert policy: Users can create messages for tickets in their organization
CREATE POLICY "Users can create messages in their organization"
    ON public.ticket_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
        )
    );

-- Update policy: Users can only update their own messages
CREATE POLICY "Users can update their own messages"
    ON public.ticket_messages
    FOR UPDATE
    USING (
        sender_id = auth.uid() AND
        deleted_at IS NULL
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
        )
    );

-- Delete policy (soft delete): Users can only delete their own messages
CREATE POLICY "Users can delete their own messages"
    ON public.ticket_messages
    FOR UPDATE
    USING (
        sender_id = auth.uid() AND
        deleted_at IS NULL
    );

-- Create trigger for updated_at
CREATE TRIGGER set_ticket_messages_updated_at
    BEFORE UPDATE ON public.ticket_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.ticket_messages IS 
'Stores all communications related to tickets including responses, private notes, and automated messages.';

-- Grant necessary permissions
GRANT USAGE ON TYPE public.message_origin TO anon, authenticated;
GRANT USAGE ON TYPE public.message_sender_type TO anon, authenticated; 