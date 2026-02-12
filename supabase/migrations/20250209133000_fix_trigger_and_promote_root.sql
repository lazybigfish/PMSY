-- 1. Update trigger function to include username from metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, username)
  VALUES (
    NEW.id, 
    NEW.raw_user_meta_data->>'full_name', 
    NEW.raw_user_meta_data->>'avatar_url', 
    NEW.email,
    NEW.raw_user_meta_data->>'username'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update existing root user profile (since trigger ran before this update)
-- We find the user by email since username might be null in profiles
UPDATE public.profiles
SET 
    username = 'root',
    role = 'admin'
WHERE email = 'root@pmsy.com';
