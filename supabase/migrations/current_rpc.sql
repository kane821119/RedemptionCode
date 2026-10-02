-- LIVE DATABASE REFERENCE SNAPSHOT
-- Read-only export from Supabase on 2026-10-02. This is not a migration.
-- Do not run this file against production or use it with `supabase db push`.
-- The current online database is authoritative; this snapshot may become stale.
-- EXECUTE grants are documented in README.md and are intentionally not changed here.

CREATE OR REPLACE FUNCTION public.api_approve_pending_category_request(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  request_row public.pending_category_requests%ROWTYPE;
  created_category_id uuid;
  normalized_slug text;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  SELECT * INTO request_row
  FROM public.pending_category_requests
  WHERE id = p_request_id AND status = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pending category request not found';
  END IF;

  normalized_slug := public.normalize_public_key(request_row.name);

  INSERT INTO public.categories (
    name, slug, public_route_key, show_secret_key, keep_letters,
    keep_numbers, keep_symbols, force_uppercase, keep_chinese, web_url, updated_at
  )
  VALUES (
    request_row.name,
    normalized_slug,
    normalized_slug || '-' || substr(md5(gen_random_uuid()::text), 1, 6),
    request_row.show_secret_key,
    request_row.keep_letters,
    request_row.keep_numbers,
    request_row.keep_symbols,
    request_row.force_uppercase,
    request_row.keep_chinese,
    NULLIF(btrim(request_row.web_url), ''),
    now()
  )
  RETURNING id INTO created_category_id;

  DELETE FROM public.pending_category_requests WHERE id = p_request_id;
  RETURN created_category_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_ban_code_publisher(p_publisher_id uuid, p_category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_publisher_id IS NULL OR p_category_id IS NULL THEN
    RAISE EXCEPTION 'Publisher and category IDs are required';
  END IF;

  INSERT INTO public.banned_users (email, user_id, banned_by, banned_category_id)
  VALUES (NULL, p_publisher_id, auth.uid()::text, p_category_id)
  ON CONFLICT (user_id) WHERE user_id IS NOT NULL
  DO UPDATE SET banned_category_id = EXCLUDED.banned_category_id;

  DELETE FROM public.codes WHERE publisher_id = p_publisher_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_delete_category(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM public.categories WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_delete_pending_category_request(p_request_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'Request ID is required';
  END IF;

  DELETE FROM public.pending_category_requests WHERE id = p_request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_get_code_publisher_counts()
RETURNS TABLE(publisher_id uuid, code_count bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT codes.publisher_id, count(*)::bigint
  FROM public.codes AS codes
  WHERE codes.publisher_id IS NOT NULL
  GROUP BY codes.publisher_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_get_pending_category_queue(p_include_admin_info boolean DEFAULT false)
RETURNS TABLE(
  id uuid,
  name text,
  web_url text,
  show_secret_key boolean,
  keep_letters boolean,
  keep_numbers boolean,
  keep_symbols boolean,
  force_uppercase boolean,
  keep_chinese boolean,
  submitted_by text,
  submitted_by_name text,
  submitted_by_user_id uuid,
  submitted_by_email text,
  created_at timestamptz,
  support_count integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF COALESCE(p_include_admin_info, false)
    AND (auth.uid() IS NULL OR NOT public.is_admin())
  THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT
    requests.id,
    requests.name,
    requests.web_url,
    requests.show_secret_key,
    requests.keep_letters,
    requests.keep_numbers,
    requests.keep_symbols,
    requests.force_uppercase,
    requests.keep_chinese,
    requests.submitted_by,
    COALESCE(
      NULLIF(users.raw_user_meta_data ->> 'full_name', ''),
      NULLIF(users.raw_user_meta_data ->> 'name', '')
    ),
    CASE WHEN COALESCE(p_include_admin_info, false) THEN requests.submitted_by_user_id END,
    CASE WHEN COALESCE(p_include_admin_info, false) THEN users.email::text END,
    requests.created_at,
    requests.support_count
  FROM public.pending_category_requests AS requests
  LEFT JOIN auth.users AS users ON users.id = requests.submitted_by_user_id
  WHERE requests.status = 'pending'
  ORDER BY requests.created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_insert_codes_bulk(
  p_category_id uuid,
  p_codes text[],
  p_secrets text[],
  p_contributor text,
  p_notes text[] DEFAULT NULL::text[]
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  inserted_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.banned_users WHERE user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'This account is banned from submitting redemption codes';
  END IF;

  INSERT INTO public.codes (category_id, code, secret_key, contributor, note, publisher_id)
  SELECT
    p_category_id,
    p_codes[s.i],
    p_secrets[s.i],
    COALESCE(NULLIF(p_contributor, ''), '匿名訪客'),
    p_notes[s.i],
    auth.uid()
  FROM generate_subscripts(p_codes, 1) AS s(i)
  ON CONFLICT (category_id, code) DO NOTHING;

  GET DIAGNOSTICS inserted_count = ROW_COUNT;
  RETURN inserted_count;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_list_banned_code_publishers()
RETURNS TABLE(user_id uuid, banned_category_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN QUERY
  SELECT banned_users.user_id, banned_users.banned_category_id
  FROM public.banned_users
  WHERE banned_users.user_id IS NOT NULL;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_submit_pending_category_request(
  p_name text,
  p_web_url text,
  p_show_secret_key boolean,
  p_keep_letters boolean,
  p_keep_numbers boolean,
  p_keep_symbols boolean,
  p_force_uppercase boolean,
  p_keep_chinese boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  request_id uuid;
  authenticated_email text;
BEGIN
  IF auth.uid() IS NULL
    OR COALESCE((auth.jwt() ->> 'is_anonymous')::boolean, false)
    OR auth.jwt() -> 'app_metadata' ->> 'provider' IS DISTINCT FROM 'google'
  THEN
    RAISE EXCEPTION 'Google sign-in required';
  END IF;

  authenticated_email := NULLIF(lower(btrim(auth.jwt() ->> 'email')), '');
  IF EXISTS (
    SELECT 1
    FROM public.banned_users AS banned
    WHERE banned.user_id = auth.uid()
      OR (
        banned.email IS NOT NULL
        AND lower(btrim(banned.email)) = authenticated_email
      )
  ) THEN
    RAISE EXCEPTION 'This account is banned from submitting requests';
  END IF;

  INSERT INTO public.pending_category_requests (
    name, web_url, show_secret_key, keep_letters, keep_numbers,
    keep_symbols, force_uppercase, keep_chinese, status, submitted_by, submitted_by_user_id
  )
  VALUES (
    p_name, p_web_url, p_show_secret_key, p_keep_letters, p_keep_numbers,
    p_keep_symbols, p_force_uppercase, p_keep_chinese, 'pending', 'user', auth.uid()
  )
  RETURNING id INTO request_id;

  RETURN request_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_support_pending_category_request(p_request_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.pending_category_requests
  SET support_count = support_count + 1
  WHERE id = p_request_id AND status = 'pending'
  RETURNING support_count INTO v_count;

  RETURN COALESCE(v_count, 0);
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_track_category_click(p_category_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.categories
  SET total_clicks = total_clicks + 1
  WHERE id = p_category_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.api_update_category(
  p_id uuid,
  p_name text,
  p_show_secret boolean,
  p_keep_letters boolean,
  p_keep_numbers boolean,
  p_keep_symbols boolean,
  p_force_upper boolean,
  p_keep_chinese boolean,
  p_web_url text DEFAULT NULL::text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  UPDATE public.categories
  SET name = p_name,
      show_secret_key = p_show_secret,
      keep_letters = p_keep_letters,
      keep_numbers = p_keep_numbers,
      keep_symbols = p_keep_symbols,
      force_uppercase = p_force_upper,
      keep_chinese = p_keep_chinese,
      web_url = NULLIF(TRIM(p_web_url), '')
  WHERE id = p_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.batch_claim_codes(code_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.codes
  SET claim_count = claim_count + 1
  WHERE id = ANY(code_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.batch_report_codes(code_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'pg_temp'
AS $function$
BEGIN
  UPDATE public.codes
  SET report_count = report_count + 1
  WHERE id = ANY(code_ids);
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE email = COALESCE(
      auth.jwt() ->> 'email',
      auth.jwt() -> 'user_metadata' ->> 'email'
    )
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.normalize_public_key(raw_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $function$
  SELECT
    CASE
      WHEN COALESCE(trim(raw_text), '') = '' THEN 'category'
      ELSE regexp_replace(
        lower(regexp_replace(trim(raw_text), '[^a-zA-Z0-9]+', '-', 'g')),
        '^-+|-+$',
        '',
        'g'
      )
    END;
$function$;