/**
 * @description Updates RLS policies for ticket_messages to allow both employees and customers to view and create messages
 * @schema public
 * @version 1.0.0
 * @date 2024-01-27
 */

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view messages in their organization" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can create messages in their organization" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can update their own messages" ON public.ticket_messages;
DROP POLICY IF EXISTS "Users can delete their own messages" ON public.ticket_messages;

-- Create new policies that handle both employees and customers

-- View policy: Users can view messages for tickets they have access to
CREATE POLICY "Users can view ticket messages"
    ON public.ticket_messages
    FOR SELECT
    USING (
        -- Employees can view messages in their organization
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = ticket_messages.organization_id
        )
        OR
        -- Customers can view messages for their own tickets
        EXISTS (
            SELECT 1 FROM public.tickets t
            JOIN public.customers c ON c.id = t.customer_id
            WHERE t.id = ticket_messages.ticket_id
            AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

-- Insert policy: Users can create messages for tickets they have access to
CREATE POLICY "Users can create ticket messages"
    ON public.ticket_messages
    FOR INSERT
    WITH CHECK (
        -- Employees can create messages in their organization
        EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.user_id = auth.uid()
            AND e.organization_id = organization_id
        )
        OR
        -- Customers can create messages for their own tickets
        EXISTS (
            SELECT 1 FROM public.tickets t
            JOIN public.customers c ON c.id = t.customer_id
            WHERE t.id = ticket_id
            AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
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
        -- Employees can update in their organization
        (
            EXISTS (
                SELECT 1 FROM public.employees e
                WHERE e.user_id = auth.uid()
                AND e.organization_id = organization_id
            )
        )
        OR
        -- Customers can update their own messages
        (
            EXISTS (
                SELECT 1 FROM public.tickets t
                JOIN public.customers c ON c.id = t.customer_id
                WHERE t.id = ticket_id
                AND c.email = (SELECT email FROM auth.users WHERE id = auth.uid())
            )
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