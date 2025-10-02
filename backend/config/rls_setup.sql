-- Row Level Security Setup for WazGo Application
-- This ensures only authenticated admin users can access sensitive data

-- Enable Row Level Security on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pages ENABLE ROW LEVEL SECURITY;

-- Create admin role if it doesn't exist
DO $$
BEGIN
   IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'wazgo_admin') THEN
      CREATE ROLE wazgo_admin;
   END IF;
END
$$;

-- Grant necessary permissions to admin role
GRANT SELECT, INSERT, UPDATE, DELETE ON users TO wazgo_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON contacts TO wazgo_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON pages TO wazgo_admin;

-- Users table policies
-- Only admins can see all users
DROP POLICY IF EXISTS users_admin_only ON users;
CREATE POLICY users_admin_only ON users
    FOR ALL
    USING (current_setting('app.current_user_role', true) = 'admin');

-- Allow users to see their own record for password changes (if needed)
DROP POLICY IF EXISTS users_self ON users;
CREATE POLICY users_self ON users
    FOR SELECT
    USING (id::text = current_setting('app.current_user_id', true));

-- Contacts table policies
-- Only admins can access contact submissions
DROP POLICY IF EXISTS contacts_admin_only ON contacts;
CREATE POLICY contacts_admin_only ON contacts
    FOR ALL
    USING (current_setting('app.current_user_role', true) = 'admin');

-- Pages table policies
-- Only admins can manage pages
DROP POLICY IF EXISTS pages_admin_only ON pages;
CREATE POLICY pages_admin_only ON pages
    FOR ALL
    USING (current_setting('app.current_user_role', true) = 'admin');

-- Create function to set session variables for authenticated users
CREATE OR REPLACE FUNCTION set_admin_session(user_id TEXT, user_role TEXT DEFAULT 'admin')
RETURNS VOID AS $$
BEGIN
    -- Set session variables that RLS policies will check
    PERFORM set_config('app.current_user_id', user_id, false);
    PERFORM set_config('app.current_user_role', user_role, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to clear session variables on logout
CREATE OR REPLACE FUNCTION clear_admin_session()
RETURNS VOID AS $$
BEGIN
    -- Clear session variables
    PERFORM set_config('app.current_user_id', '', false);
    PERFORM set_config('app.current_user_role', '', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions on the functions
GRANT EXECUTE ON FUNCTION set_admin_session(TEXT, TEXT) TO wazgo_admin;
GRANT EXECUTE ON FUNCTION clear_admin_session() TO wazgo_admin;
