-- Create a function to search leads by their data JSONB field
CREATE OR REPLACE FUNCTION public.search_leads(search_term text)
RETURNS SETOF leads
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT *
  FROM leads
  WHERE data::text ILIKE '%' || search_term || '%'
  ORDER BY created_at DESC
  LIMIT 100;
$$;