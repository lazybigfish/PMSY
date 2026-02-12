-- Confirm email for root user manually to bypass email verification
-- Note: confirmed_at might be a generated column in newer Supabase versions or specific configurations.
-- We only update email_confirmed_at which is the standard field for email confirmation status.
UPDATE auth.users
SET email_confirmed_at = now()
WHERE email = 'root@pmsy.com';
