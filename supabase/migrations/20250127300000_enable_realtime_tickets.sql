/**
 * @description Enables realtime for tickets table
 * @schema public
 * @version 1.0.0
 * @date 2024-01-27
 */

-- Add tickets table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE tickets; 