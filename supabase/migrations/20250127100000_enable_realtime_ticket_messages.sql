/**
 * @description Enables Realtime for ticket_messages table
 * @schema public
 * @version 1.0.0
 * @date 2024-01-27
 */

-- Add ticket_messages table to the realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE ticket_messages; 