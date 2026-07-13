
-- Restrict draw_events public read (removes winner PII exposure to anon)
DROP POLICY IF EXISTS "Draws publicly readable" ON public.draw_events;
CREATE POLICY "Draws readable by authenticated" ON public.draw_events
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.draw_events FROM anon;

-- Restrict payment_gateways: hide account_details/wallet_address from anon
DROP POLICY IF EXISTS "Gateways publicly readable when active" ON public.payment_gateways;
CREATE POLICY "Active gateways readable by authenticated" ON public.payment_gateways
  FOR SELECT TO authenticated USING (is_active = true);
REVOKE SELECT ON public.payment_gateways FROM anon;

-- Restrict tontine_participants to authenticated
DROP POLICY IF EXISTS "Participants publicly readable" ON public.tontine_participants;
CREATE POLICY "Participants readable by authenticated" ON public.tontine_participants
  FOR SELECT TO authenticated USING (true);
REVOKE SELECT ON public.tontine_participants FROM anon;

-- Lock down SECURITY DEFINER trigger helpers from being called via the API
REVOKE EXECUTE ON FUNCTION public.apply_financial_transaction() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
