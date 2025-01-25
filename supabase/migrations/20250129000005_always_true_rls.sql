/**
 * @description Adds simplest possible RLS policy that always returns true
 * @schema public
 * @version 1.0.0
 * @date 2024-01-29
 */

-- Enable RLS
ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

-- Create policy that always returns true
CREATE POLICY "Always allow"
    ON public.ticket_messages
    FOR ALL
    USING (true); 