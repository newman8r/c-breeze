/**
 * @description Sets up user profiles table linked to Supabase auth.users and removes redundant users table
 * @schema public
 * @tables profiles, users (dropped)
 * @version 1.0.0
 * @author AI Assistant
 * @date 2024-01-20
 * 
 * @security
 * - RLS policies for profile access
 * - Drops existing users table
 * - Links profiles to auth.users
 * 
 * @dependencies
 * - Requires auth.users from Supabase
 */

-- Drop the existing users table as we'll use auth.users instead
DROP TABLE IF EXISTS public.users;

-- Create a profiles table that references auth.users
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT unique_user_profile UNIQUE (user_id)
);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Set up RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read any profile
CREATE POLICY "Profiles are viewable by everyone"
    ON public.profiles
    FOR SELECT
    USING (true);

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
    ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create a function to automatically create a profile after user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (user_id, display_name)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set up the trigger to create a profile on user creation
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Function to get total user count (modified for PostgREST compatibility)
DROP FUNCTION IF EXISTS public.get_total_users();
CREATE OR REPLACE FUNCTION public.get_total_users()
RETURNS TABLE (
    count integer
)
LANGUAGE sql
SECURITY INVOKER
STABLE    -- Add STABLE marker as this is a read-only function
AS $$
    SELECT COUNT(*)::integer as count
    FROM auth.users
    WHERE deleted_at IS NULL;
$$;

-- Grant access to the function for authenticated and anon users
GRANT EXECUTE ON FUNCTION public.get_total_users() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_total_users() TO anon;

-- Also grant access to auth.users for the function to work
GRANT SELECT ON auth.users TO anon;
GRANT SELECT ON auth.users TO authenticated; 