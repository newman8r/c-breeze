-- Add api_key to resource_type enum
ALTER TYPE public.resource_type ADD VALUE IF NOT EXISTS 'api_key'; 