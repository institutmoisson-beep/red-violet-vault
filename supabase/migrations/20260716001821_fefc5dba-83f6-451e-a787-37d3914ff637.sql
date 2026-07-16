CREATE OR REPLACE FUNCTION public.join_tontine_campaign(p_campaign_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_campaign public.tontine_campaigns%ROWTYPE;
  v_code text;
  v_attempts int := 0;
  v_new_count int;
  v_is_full boolean;
  v_next_draw timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;

  SELECT * INTO v_campaign
  FROM public.tontine_campaigns
  WHERE id = p_campaign_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Campagne introuvable';
  END IF;

  IF v_campaign.status::text <> 'OPEN' THEN
    RAISE EXCEPTION 'Cette tontine n''accepte plus de participants';
  END IF;

  IF v_campaign.current_participants_count >= v_campaign.max_participants THEN
    RAISE EXCEPTION 'Cette tontine est complète';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.tontine_participants tp
    WHERE tp.campaign_id = p_campaign_id AND tp.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Vous participez déjà à cette tontine';
  END IF;

  LOOP
    v_code := 'MSN-TON-' || lpad((floor(random() * 900 + 100))::int::text, 3, '0');
    v_attempts := v_attempts + 1;
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.tontine_participants tp
      WHERE tp.campaign_id = p_campaign_id AND tp.unique_draw_code = v_code
    ) OR v_attempts > 20;
  END LOOP;

  INSERT INTO public.tontine_participants (campaign_id, user_id, unique_draw_code)
  VALUES (p_campaign_id, auth.uid(), v_code);

  v_new_count := v_campaign.current_participants_count + 1;
  v_is_full := v_new_count >= v_campaign.max_participants;

  IF v_is_full THEN
    v_next_draw := date_trunc('day', now()) + (v_campaign.draw_hour_utc || ' hours')::interval;
    IF v_next_draw < now() THEN
      v_next_draw := v_next_draw + (v_campaign.frequency_days || ' days')::interval;
    END IF;
  ELSE
    v_next_draw := NULL;
  END IF;

  UPDATE public.tontine_campaigns
  SET current_participants_count = v_new_count,
      status = (CASE WHEN v_is_full THEN 'ACTIVE' ELSE 'OPEN' END)::public.campaign_status,
      next_draw_at = v_next_draw,
      updated_at = now()
  WHERE id = p_campaign_id;

  RETURN v_code;
END;
$function$;