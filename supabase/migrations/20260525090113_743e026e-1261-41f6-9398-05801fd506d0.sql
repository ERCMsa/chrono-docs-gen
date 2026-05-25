-- Seed first admin (username: admin / password: Admin@2026)
DO $$
DECLARE
  new_uid UUID := gen_random_uuid();
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@ercmsa.internal') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', new_uid, 'authenticated', 'authenticated',
      'admin@ercmsa.internal', crypt('Admin@2026', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"admin","full_name":"Administrateur","role":"ADMIN"}'::jsonb,
      now(), now(), '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), new_uid,
      jsonb_build_object('sub', new_uid::text, 'email', 'admin@ercmsa.internal'),
      'email', new_uid::text, now(), now(), now());
    -- Ensure profile reflects ADMIN (trigger created it from metadata, but enforce)
    UPDATE public.profiles SET role = 'ADMIN', full_name = 'Administrateur', username = 'admin'
    WHERE id = new_uid;
  END IF;
END $$;