/**
 * @description Adds satisfaction_rating column to tickets table
 * @schema public
 * @version 1.0.0
 * @date 2024-01-27
 */

-- Add satisfaction_rating column to tickets table
ALTER TABLE public.tickets
ADD COLUMN satisfaction_rating INTEGER CHECK (satisfaction_rating >= 1 AND satisfaction_rating <= 5);

-- Add comment to explain the column
COMMENT ON COLUMN public.tickets.satisfaction_rating IS 'Customer satisfaction rating from 1-5 stars, can be set when ticket is closed'; 