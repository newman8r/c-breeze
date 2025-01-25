/**
 * @description Temporarily disables RLS on ticket_messages table for testing realtime
 * @schema public
 * @version 1.0.0
 * @date 2024-01-29
 */

-- Disable RLS completely
ALTER TABLE public.ticket_messages DISABLE ROW LEVEL SECURITY; 