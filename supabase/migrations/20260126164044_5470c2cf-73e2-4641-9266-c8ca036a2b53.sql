-- Allow users to delete their own call logs
CREATE POLICY "Users can delete own call logs" 
ON public.call_logs FOR DELETE 
USING (user_id = auth.uid());

-- Allow users to delete their own SMS logs
CREATE POLICY "Users can delete own sms logs" 
ON public.sms_logs FOR DELETE 
USING (user_id = auth.uid());