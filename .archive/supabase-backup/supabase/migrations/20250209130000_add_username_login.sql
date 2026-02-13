-- 1. Modify profiles table: add username and make email optional
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS username text UNIQUE,
ALTER COLUMN email DROP NOT NULL;

-- 2. Create function to sign in with username
-- Note: Supabase Auth works primarily with email/password.
-- To support username login, we will treat the username as a lookup to find the email, 
-- or we can use a "dummy" email pattern like `username@system.local` if we want to stick to standard auth.
-- Given the requirement "User login do not use email username, but custom login user", 
-- the cleanest way in Supabase without external Auth providers is:
--   a. Backend: Store `username` in metadata or a mapping table.
--   b. Frontend: When user types "root", we look up the email for "root" (e.g., via an Edge Function or RPC) and then sign in with that email + password.
--   c. OR: We strictly enforce `username@pmsy.local` pattern for all users.
--
-- Let's go with Approach C (Virtual Email) as it's the most robust and requires zero changes to Supabase Auth internals.
-- Admin user "root" will actually be "root@pmsy.local" in auth.users.
-- User "zhangsan" will be "zhangsan@pmsy.local".
--
-- We will add a trigger to ensure username is synced to profiles.

-- 3. Update existing profiles if any to have a default username from email
UPDATE public.profiles 
SET username = split_part(email, '@', 1) 
WHERE username IS NULL;

-- 4. Set admin username to 'root' if exists (assuming admin email was admin@example.com or similar)
-- We will handle the specific 'root' user creation in the seed script or manually.
-- But here we can try to update if a likely candidate exists.

-- 5. Create a function to help frontend lookup email by username (if we wanted Approach B, but we are doing Approach C for simplicity)
-- However, let's strictly support the migration structure.

-- No changes needed for schema other than the column addition above.
