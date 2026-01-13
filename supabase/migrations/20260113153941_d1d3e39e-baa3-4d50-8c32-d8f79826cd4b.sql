
-- Drop the existing SELECT policy for leads
DROP POLICY IF EXISTS "Users can view leads based on role and list access" ON public.leads;

-- Recreate the SELECT policy targeting authenticated users explicitly
CREATE POLICY "Users can view leads based on role and list access" 
ON public.leads 
FOR SELECT 
TO authenticated
USING (
  is_admin_or_manager(auth.uid())
  OR
  list_id IN (
    SELECT lu.list_id 
    FROM list_users lu 
    WHERE lu.user_id = auth.uid()
  )
);

-- Add foreign key constraint from leads.list_id to lists.id if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY' 
    AND table_name = 'leads' 
    AND constraint_name = 'leads_list_id_fkey'
  ) THEN
    ALTER TABLE public.leads 
    ADD CONSTRAINT leads_list_id_fkey 
    FOREIGN KEY (list_id) REFERENCES public.lists(id) ON DELETE SET NULL;
  END IF;
END $$;
