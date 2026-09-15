-- Local dev seed: creates a password-auth user so `supabase db reset`
-- leaves behind a ready-to-use sign-in, instead of having to recreate one
-- by hand (e.g. via admin.auth.admin.createUser) after every reset.
--
-- Local/dev only. This directly inserts into auth.users/auth.identities,
-- bypassing GoTrue's signup flow entirely -- fine for the ephemeral local
-- Postgres instance `supabase start` spins up, never something to point at
-- a real project.
do $$
declare
  v_user_id uuid;
begin
  select id into v_user_id from auth.users where email = 'vancemcgrady@gmail.com';

  if v_user_id is null then
    v_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      created_at, updated_at, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) values (
      '00000000-0000-0000-0000-000000000000',
      v_user_id,
      'authenticated',
      'authenticated',
      'vancemcgrady@gmail.com',
      crypt('Dev123!', gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{}',
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    insert into auth.identities (
      user_id, provider_id, identity_data, provider, 
      last_sign_in_at, created_at, updated_at
    ) values (
      v_user_id,
      v_user_id::text,
      jsonb_build_object('sub', v_user_id::text, 'email', 'vancemcgrady@gmail.com'),
      'email',
      now(),
      now(),
      now()
    );
  end if;
end $$;
