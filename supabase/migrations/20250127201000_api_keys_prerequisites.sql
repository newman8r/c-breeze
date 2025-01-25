-- Rename migration to: 20250127201000_api_keys_prerequisites.sql
-- Enable pgcrypto for secure hashing
create extension if not exists "pgcrypto";

-- Function to generate a secure API key
create or replace function generate_api_key()
returns table (
    api_key text,
    key_hash text,
    key_last_four text
) 
language plpgsql
as $$
declare
    raw_key text;
    prefix text := 'pk_';  -- 'pk' for production key
begin
    -- Generate a secure random string (32 bytes = 44 base64 chars)
    raw_key := prefix || encode(gen_random_bytes(32), 'base64');
    
    -- Replace any non-alphanumeric characters for URL safety
    raw_key := regexp_replace(raw_key, '[^a-zA-Z0-9]', '', 'g');
    
    -- Get the last 4 characters
    key_last_four := right(raw_key, 4);
    
    -- Generate a secure hash using pgcrypto's crypt function
    key_hash := crypt(raw_key, gen_salt('bf'));
    
    return query select raw_key, key_hash, key_last_four;
end;
$$; 