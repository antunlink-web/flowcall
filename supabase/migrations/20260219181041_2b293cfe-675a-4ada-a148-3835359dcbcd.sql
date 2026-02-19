-- Allow users to delete their own dial_requests
CREATE POLICY "Users can delete their own dial requests"
ON public.dial_requests
FOR DELETE
USING (auth.uid() = user_id);

-- Allow users to delete their own sms_requests
CREATE POLICY "Users can delete their own sms requests"
ON public.sms_requests
FOR DELETE
USING (auth.uid() = user_id);
