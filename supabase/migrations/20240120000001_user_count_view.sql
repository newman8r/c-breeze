/**
 * @description Creates a secure view for user counts instead of using a function
 * @schema public
 * @tables auth.users
 * @version 1.0.0
 * @author AI Assistant
 * @date 2024-01-20
 * 
 * @security
 * - View accessible to all users
 * - Only shows count, no sensitive data
 */

-- Drop the previous function if it exists
DROP FUNCTION IF EXISTS public.get_total_users();

-- Create a view for user statistics
CREATE OR REPLACE VIEW public.user_statistics AS
SELECT 
    COUNT(*)::integer as total_users
FROM auth.users
WHERE deleted_at IS NULL;

-- Grant access to the view
GRANT SELECT ON public.user_statistics TO anon;
GRANT SELECT ON public.user_statistics TO authenticated; 