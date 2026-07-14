
-- 1) SECURITY DEFINER → INVOKER for helper functions used in RLS
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_verified(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND kyc_status = 'VERIFIED'
  );
$$;

-- 2) tontine_participants: restrict SELECT
DROP POLICY IF EXISTS "Participants readable by authenticated" ON public.tontine_participants;

CREATE POLICY "Participants readable to self, co-participants, admins"
ON public.tontine_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.tontine_participants p
    WHERE p.campaign_id = tontine_participants.campaign_id
      AND p.user_id = auth.uid()
  )
);

-- 3) draw_events: restrict SELECT to campaign participants, winner, or admins
DROP POLICY IF EXISTS "Draws readable by authenticated" ON public.draw_events;

CREATE POLICY "Draws readable to participants, winner, admins"
ON public.draw_events
FOR SELECT
TO authenticated
USING (
  winner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR EXISTS (
    SELECT 1 FROM public.tontine_participants p
    WHERE p.campaign_id = draw_events.campaign_id
      AND p.user_id = auth.uid()
  )
);

-- 4) avatars bucket: restrict read to self + co-participants
DROP POLICY IF EXISTS avatars_read_auth ON storage.objects;

CREATE POLICY "avatars_read_scoped"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1
      FROM public.tontine_participants me
      JOIN public.tontine_participants other
        ON other.campaign_id = me.campaign_id
      WHERE me.user_id = auth.uid()
        AND (storage.foldername(name))[1] = (other.user_id)::text
    )
  )
);
