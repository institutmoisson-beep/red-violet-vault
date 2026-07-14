
-- 1) Drop KYC requirement to join
DROP POLICY IF EXISTS "Verified users can join" ON public.tontine_participants;
CREATE POLICY "Authenticated users can join"
  ON public.tontine_participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) Add debt column to wallets
ALTER TABLE public.wallets ADD COLUMN IF NOT EXISTS debt numeric(14,2) NOT NULL DEFAULT 0;

-- 3) Allow users to update their own ledger entries (to mark manual payments)
DROP POLICY IF EXISTS "Users pay their own installments" ON public.tontine_payments_ledger;
CREATE POLICY "Users pay their own installments"
  ON public.tontine_payments_ledger FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4) Update recharge trigger to first apply to debt
CREATE OR REPLACE FUNCTION public.apply_financial_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  current_balance NUMERIC(14,2);
  current_debt NUMERIC(14,2);
  debt_payoff NUMERIC(14,2);
  remainder NUMERIC(14,2);
BEGIN
  IF NEW.type = 'RECHARGE' AND NEW.status = 'APPROVED' AND
     (OLD.status IS DISTINCT FROM 'APPROVED') THEN
    -- Ensure wallet exists
    INSERT INTO public.wallets (user_id, balance, debt) VALUES (NEW.user_id, 0, 0)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT balance, debt INTO current_balance, current_debt
      FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;

    debt_payoff := LEAST(NEW.amount, COALESCE(current_debt, 0));
    remainder := NEW.amount - debt_payoff;

    UPDATE public.wallets
      SET balance = balance + remainder,
          debt = GREATEST(0, COALESCE(debt,0) - debt_payoff),
          updated_at = now()
    WHERE user_id = NEW.user_id;

    IF debt_payoff > 0 THEN
      INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference, note)
      VALUES (NEW.user_id, 'DEBIT', debt_payoff, current_balance + remainder, NEW.transaction_reference, 'Remboursement automatique du crédit');
    END IF;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference, note)
    VALUES (NEW.user_id, 'CREDIT', NEW.amount, current_balance + remainder, NEW.transaction_reference,
            CASE WHEN debt_payoff > 0 THEN 'Recharge (dont ' || debt_payoff || ' affecté au crédit)' ELSE 'Recharge approuvée' END);
  END IF;

  IF TG_OP = 'INSERT' AND NEW.type = 'WITHDRAWAL' AND NEW.status = 'PENDING' THEN
    SELECT balance INTO current_balance FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
    IF current_balance IS NULL OR current_balance < NEW.amount THEN
      RAISE EXCEPTION 'Solde insuffisant pour ce retrait';
    END IF;
    UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference, note)
    VALUES (NEW.user_id, 'DEBIT', NEW.amount, current_balance - NEW.amount, NEW.transaction_reference, 'Retrait en attente');
  END IF;

  IF NEW.type = 'WITHDRAWAL' AND NEW.status = 'REJECTED' AND OLD.status = 'PENDING' THEN
    SELECT balance INTO current_balance FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
    UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference, note)
    VALUES (NEW.user_id, 'CREDIT', NEW.amount, current_balance + NEW.amount, NEW.transaction_reference, 'Retrait refusé — remboursement');
  END IF;

  RETURN NEW;
END;
$function$;
