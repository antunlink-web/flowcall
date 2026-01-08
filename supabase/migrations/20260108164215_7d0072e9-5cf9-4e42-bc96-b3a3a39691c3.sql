-- Allow owners to update any profile (for archiving users)
CREATE POLICY "Owners can update any profile" 
ON public.profiles 
FOR UPDATE 
USING (has_role(auth.uid(), 'owner'::app_role));

-- Allow owners to delete profiles (for deleting users)
CREATE POLICY "Owners can delete profiles" 
ON public.profiles 
FOR DELETE 
USING (has_role(auth.uid(), 'owner'::app_role));