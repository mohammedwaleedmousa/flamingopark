-- Grant admin role to existing admin user
DO $$
DECLARE
  v_user_id uuid;
  v_email text := 'aiengineer77@icloud.com';
BEGIN

  -- Find existing user from Supabase Auth
  SELECT id 
  INTO v_user_id
  FROM auth.users
  WHERE email = v_email
  LIMIT 1;

  -- Add admin role if user exists
  IF v_user_id IS NOT NULL THEN

    INSERT INTO public.user_roles (user_id, role)
    VALUES (v_user_id, 'admin')
    ON CONFLICT (user_id, role) DO NOTHING;

  END IF;

END $$;