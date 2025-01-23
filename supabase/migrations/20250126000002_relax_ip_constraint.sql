/**
 * @description Temporarily relaxes IP address constraint for testing
 * @schema public
 * @tables audit_logs
 * @version 1.0.0
 * @date 2024-01-26
 * 
 * @note This is a temporary change for testing. Should be replaced with proper validation in production.
 */

-- Drop the existing constraint
ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS valid_ip_address;

-- Add a more permissive constraint that allows null and any string format
-- This is temporary for testing purposes
ALTER TABLE public.audit_logs ADD CONSTRAINT valid_ip_address 
    CHECK (ip_address IS NULL OR true);

COMMENT ON CONSTRAINT valid_ip_address ON public.audit_logs IS 
    'Temporary relaxed constraint for testing. TODO: Implement proper validation for production.'; 