CREATE TABLE public.user_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  path text,
  detail text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX user_activity_created_idx ON public.user_activity (created_at DESC);
CREATE INDEX user_activity_user_idx ON public.user_activity (user_id, created_at DESC);
GRANT SELECT, INSERT ON public.user_activity TO authenticated;
GRANT ALL ON public.user_activity TO service_role;
ALTER TABLE public.user_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users log own activity" ON public.user_activity FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND char_length(event_type) <= 40 AND coalesce(char_length(detail),0) <= 500 AND coalesce(char_length(path),0) <= 300);
CREATE POLICY "Admins read activity" ON public.user_activity FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_activity;