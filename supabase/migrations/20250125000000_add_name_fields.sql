-- Add first_name and last_name columns to employees table
ALTER TABLE public.employees
ADD COLUMN first_name text,
ADD COLUMN last_name text;

-- Update existing records with names from user metadata
CREATE OR REPLACE FUNCTION update_employee_names() RETURNS void AS $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN SELECT e.id, u.raw_user_meta_data->>'first_name' as first_name, 
                    u.raw_user_meta_data->>'last_name' as last_name
             FROM auth.users u
             JOIN public.employees e ON e.user_id = u.id
    LOOP
        UPDATE public.employees
        SET first_name = r.first_name,
            last_name = r.last_name
        WHERE id = r.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 