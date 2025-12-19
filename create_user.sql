-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Delete existing user
DELETE FROM auth.users WHERE email = 'to4799po@gmail.com';
DELETE FROM public.profiles WHERE email = 'to4799po@gmail.com';

-- Create user with proper bcrypt password hash
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'to4799po@gmail.com',
  crypt('a22c1575', gen_salt('bf')),
  NOW(),
  NOW(),
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{}',
  '',
  ''
);

-- Verify user was created
SELECT email, email_confirmed_at IS NOT NULL as confirmed, role FROM auth.users WHERE email = 'to4799po@gmail.com';
