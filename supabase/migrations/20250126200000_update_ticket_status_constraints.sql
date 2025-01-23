/**
 * @description Updates ticket status constraints to remove 'urgent' from status options
 * @schema public
 * @version 1.0.0
 * @date 2024-01-26
 */

-- First drop the existing constraints
ALTER TABLE public.tickets
DROP CONSTRAINT IF EXISTS valid_status,
DROP CONSTRAINT IF EXISTS valid_priority;

-- Update any tickets that have status 'urgent' to 'in_progress'
UPDATE public.tickets
SET status = 'in_progress'
WHERE status = 'urgent';

-- Add the new constraints
ALTER TABLE public.tickets
ADD CONSTRAINT valid_status CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
ADD CONSTRAINT valid_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent')); 