
-- Helper SECURITY DEFINER pour éviter la récursion RLS sur tontine_participants
CREATE OR REPLACE FUNCTION public.is_campaign_participant(_user_id uuid, _campaign_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tontine_participants
    WHERE user_id = _user_id AND campaign_id = _campaign_id
  );
$$;

REVOKE ALL ON FUNCTION public.is_campaign_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_campaign_participant(uuid, uuid) TO authenticated;

-- has_role doit rester SECURITY DEFINER pour éviter la récursion via user_roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- tontine_participants : politique sans auto-référence
DROP POLICY IF EXISTS "Participants readable to self, co-participants, admins" ON public.tontine_participants;
DROP POLICY IF EXISTS "Participants readable by authenticated" ON public.tontine_participants;
DROP POLICY IF EXISTS "Participants publicly readable" ON public.tontine_participants;

CREATE POLICY "Participants readable to self, co-participants, admins"
ON public.tontine_participants
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_campaign_participant(auth.uid(), campaign_id)
);

-- draw_events
DROP POLICY IF EXISTS "Draws readable to participants, winner, admins" ON public.draw_events;
DROP POLICY IF EXISTS "Draws readable by authenticated" ON public.draw_events;

CREATE POLICY "Draws readable to participants, winner, admins"
ON public.draw_events
FOR SELECT
TO authenticated
USING (
  winner_user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_campaign_participant(auth.uid(), campaign_id)
);

-- Avatars bucket
DROP POLICY IF EXISTS "avatars_read_scoped" ON storage.objects;

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
      SELECT 1 FROM public.tontine_participants me
      WHERE me.user_id = auth.uid()
        AND public.is_campaign_participant(
          ((storage.foldername(name))[1])::uuid,
          me.campaign_id
        )
    )
  )
);
