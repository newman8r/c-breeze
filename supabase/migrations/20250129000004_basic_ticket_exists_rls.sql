/**
 * @description Adds basic RLS policy that only checks if the referenced ticket exists
 * @schema public
 * @version 1.0.0
 * @date 2024-01-29
 */

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Create basic policy that only checks if the ticket exists
CREATE POLICY "Basic ticket existence check"
    ON public.ticket_messages
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.tickets t
            WHERE t.id = ticket_id
        )
    ); 