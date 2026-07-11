
-- =====================
-- ENUMS
-- =====================
CREATE TYPE public.app_role AS ENUM ('admin', 'user');
CREATE TYPE public.kyc_status AS ENUM ('PENDING_VERIFICATION', 'VERIFIED', 'REJECTED');
CREATE TYPE public.campaign_status AS ENUM ('DRAFT', 'OPEN', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE public.payment_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSING', 'DISBURSED');
CREATE TYPE public.transaction_type AS ENUM ('PURCHASE', 'RECHARGE', 'WITHDRAWAL', 'INSTALLMENT', 'REFUND');
CREATE TYPE public.wallet_tx_type AS ENUM ('CREDIT', 'DEBIT');

-- =====================
-- PROFILES
-- =====================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT,
  last_name TEXT,
  date_of_birth DATE,
  phone TEXT,
  whatsapp TEXT,
  avatar_url TEXT,
  id_card_recto_url TEXT,
  id_card_verso_url TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  address TEXT,
  city TEXT,
  country TEXT DEFAULT 'CI',
  preferred_language TEXT DEFAULT 'fr',
  preferred_currency TEXT DEFAULT 'XOF',
  kyc_status public.kyc_status NOT NULL DEFAULT 'PENDING_VERIFICATION',
  kyc_submitted_at TIMESTAMPTZ,
  kyc_verified_at TIMESTAMPTZ,
  kyc_rejection_reason TEXT,
  ai_fraud_score NUMERIC(4,2),
  ai_fraud_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================
-- USER ROLES
-- =====================
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  );
$$;

CREATE OR REPLACE FUNCTION public.is_verified(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = _user_id AND kyc_status = 'VERIFIED'
  );
$$;

-- profiles policies
CREATE POLICY "Users can view their own profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- user_roles policies
CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins can view all roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Auto-create profile & wallet on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    NEW.raw_user_meta_data ->> 'avatar_url'
  );
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  INSERT INTO public.wallets (user_id, balance) VALUES (NEW.id, 0);
  RETURN NEW;
END;
$$;

-- =====================
-- CATEGORIES
-- =====================
CREATE TABLE public.tontine_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  name_fr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  icon TEXT NOT NULL,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tontine_categories TO anon, authenticated;
GRANT ALL ON public.tontine_categories TO service_role;
ALTER TABLE public.tontine_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are publicly readable"
  ON public.tontine_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage categories"
  ON public.tontine_categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.tontine_categories (slug, name_fr, name_en, icon, sort_order) VALUES
  ('alimentaire',     'Alimentaire',      'Food & Groceries',   '🍚', 1),
  ('vivrier',         'Vivrier',          'Local Crops',        '🌾', 2),
  ('electromenager',  'Électroménager',   'Home Appliances',    '🧊', 3),
  ('electrotechnique','Électrotechnique', 'Electronics',        '🔌', 4),
  ('machines-outils', 'Machines & Outils','Machines & Tools',   '🛠️', 5),
  ('moto-voiture',    'Moto & Voiture',   'Vehicles',           '🏍️', 6),
  ('divertissement',  'Divertissement',   'Leisure',            '🎧', 7);

-- =====================
-- CAMPAIGNS
-- =====================
CREATE TABLE public.tontine_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID REFERENCES public.tontine_categories(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  description TEXT,
  images TEXT[] NOT NULL DEFAULT '{}',
  total_price NUMERIC(14,2) NOT NULL,
  installment_price NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  max_participants INT NOT NULL CHECK (max_participants > 1),
  current_participants_count INT NOT NULL DEFAULT 0,
  frequency_days INT NOT NULL DEFAULT 5 CHECK (frequency_days > 0),
  draw_hour_utc INT NOT NULL DEFAULT 18 CHECK (draw_hour_utc BETWEEN 0 AND 23),
  start_date DATE,
  end_date DATE,
  next_draw_at TIMESTAMPTZ,
  current_cycle INT NOT NULL DEFAULT 0,
  status public.campaign_status NOT NULL DEFAULT 'OPEN',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.tontine_campaigns TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.tontine_campaigns TO authenticated;
GRANT ALL ON public.tontine_campaigns TO service_role;
ALTER TABLE public.tontine_campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Campaigns publicly readable"
  ON public.tontine_campaigns FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Admins manage campaigns"
  ON public.tontine_campaigns FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================
-- PARTICIPANTS
-- =====================
CREATE TABLE public.tontine_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.tontine_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  unique_draw_code TEXT NOT NULL,
  has_won BOOLEAN NOT NULL DEFAULT false,
  draw_win_cycle_number INT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, user_id),
  UNIQUE (campaign_id, unique_draw_code)
);
GRANT SELECT ON public.tontine_participants TO anon, authenticated;
GRANT INSERT, UPDATE ON public.tontine_participants TO authenticated;
GRANT ALL ON public.tontine_participants TO service_role;
ALTER TABLE public.tontine_participants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants publicly readable"
  ON public.tontine_participants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Verified users can join"
  ON public.tontine_participants FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_verified(auth.uid()));
CREATE POLICY "Admins update participants"
  ON public.tontine_participants FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- PAYMENTS LEDGER
-- =====================
CREATE TABLE public.tontine_payments_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.tontine_campaigns(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  payment_timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
  note TEXT
);
GRANT SELECT ON public.tontine_payments_ledger TO authenticated;
GRANT ALL ON public.tontine_payments_ledger TO service_role;
ALTER TABLE public.tontine_payments_ledger ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their own payments"
  ON public.tontine_payments_ledger FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "Admins view all payments"
  ON public.tontine_payments_ledger FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- WALLETS
-- =====================
CREATE TABLE public.wallets (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance NUMERIC(14,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  currency TEXT NOT NULL DEFAULT 'XOF',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their wallet"
  ON public.wallets FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all wallets"
  ON public.wallets FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.wallet_tx_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  balance_after NUMERIC(14,2) NOT NULL,
  reference TEXT,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins view all wallet transactions"
  ON public.wallet_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- PAYMENT GATEWAYS (admin-configured)
-- =====================
CREATE TABLE public.payment_gateways (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  method_name TEXT NOT NULL,
  method_key TEXT NOT NULL UNIQUE,
  provider TEXT NOT NULL,
  account_details TEXT,
  ussd_template_syntax TEXT,
  deep_link_template TEXT,
  wallet_address TEXT,
  network TEXT,
  logo TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  supports_recharge BOOLEAN NOT NULL DEFAULT true,
  supports_withdrawal BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payment_gateways TO anon, authenticated;
GRANT ALL ON public.payment_gateways TO service_role;
ALTER TABLE public.payment_gateways ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Gateways publicly readable when active"
  ON public.payment_gateways FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY "Admins view all gateways"
  ON public.payment_gateways FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage gateways"
  ON public.payment_gateways FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.payment_gateways (method_name, method_key, provider, account_details, ussd_template_syntax, deep_link_template, is_active) VALUES
  ('Wave', 'wave', 'mobile_money', '+225 07 00 00 00 00', NULL, 'https://pay.wave.com/m/{{ACCOUNT}}/c/xof/?amount={{AMOUNT}}', true),
  ('Orange Money', 'orange_money', 'mobile_money', '+225 07 00 00 00 00', '#144*82*{{ACCOUNT}}*{{AMOUNT}}*{{PIN}}#', NULL, true),
  ('MTN MoMo', 'mtn_momo', 'mobile_money', '+225 05 00 00 00 00', '*133*1*1*{{ACCOUNT}}*{{AMOUNT}}#', NULL, true),
  ('Moov Money', 'moov_money', 'mobile_money', '+225 01 00 00 00 00', '*155*1*{{ACCOUNT}}*{{AMOUNT}}#', NULL, true),
  ('USDT (TRC20)', 'usdt_trc20', 'crypto', 'TXxxxxxxxxxxxxxxxxxxxxxxxxx', NULL, NULL, true),
  ('Bitcoin', 'btc', 'crypto', 'bc1qxxxxxxxxxxxxxxxxxxxxx', NULL, NULL, true),
  ('Carte bancaire', 'card', 'card', 'Virement bancaire manuel', NULL, NULL, true);

-- =====================
-- FINANCIAL TRANSACTIONS (Smart Checkout)
-- =====================
CREATE TABLE public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type public.transaction_type NOT NULL,
  amount NUMERIC(14,2) NOT NULL,
  currency TEXT NOT NULL DEFAULT 'XOF',
  payment_method TEXT,
  gateway_id UUID REFERENCES public.payment_gateways(id) ON DELETE SET NULL,
  transaction_reference TEXT,
  proof_screenshot_url TEXT,
  destination_details TEXT,
  status public.payment_status NOT NULL DEFAULT 'PENDING',
  associated_campaign_id UUID REFERENCES public.tontine_campaigns(id) ON DELETE SET NULL,
  admin_note TEXT,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.financial_transactions TO authenticated;
GRANT UPDATE ON public.financial_transactions TO authenticated;
GRANT ALL ON public.financial_transactions TO service_role;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view their transactions"
  ON public.financial_transactions FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users create their transactions"
  ON public.financial_transactions FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Admins view all transactions"
  ON public.financial_transactions FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update transactions"
  ON public.financial_transactions FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- =====================
-- DRAW EVENTS (transparency ledger)
-- =====================
CREATE TABLE public.draw_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.tontine_campaigns(id) ON DELETE CASCADE,
  cycle_number INT NOT NULL,
  winner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_draw_code TEXT NOT NULL,
  winner_first_name TEXT,
  winner_last_name TEXT,
  winner_avatar_url TEXT,
  broadcast_text TEXT,
  executed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (campaign_id, cycle_number)
);
GRANT SELECT ON public.draw_events TO anon, authenticated;
GRANT ALL ON public.draw_events TO service_role;
ALTER TABLE public.draw_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Draws publicly readable"
  ON public.draw_events FOR SELECT TO anon, authenticated USING (true);

-- =====================
-- DELIVERY ORDERS
-- =====================
CREATE TABLE public.delivery_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  draw_event_id UUID NOT NULL REFERENCES public.draw_events(id) ON DELETE CASCADE UNIQUE,
  winner_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.tontine_campaigns(id) ON DELETE CASCADE,
  shipping_address TEXT,
  shipping_city TEXT,
  shipping_phone TEXT,
  status TEXT NOT NULL DEFAULT 'AWAITING_ADDRESS',
  deadline_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '48 hours'),
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.delivery_orders TO authenticated;
GRANT ALL ON public.delivery_orders TO service_role;
ALTER TABLE public.delivery_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Winners view their delivery"
  ON public.delivery_orders FOR SELECT TO authenticated USING (winner_user_id = auth.uid());
CREATE POLICY "Winners update their delivery"
  ON public.delivery_orders FOR UPDATE TO authenticated USING (winner_user_id = auth.uid());
CREATE POLICY "Admins manage deliveries"
  ON public.delivery_orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- =====================
-- updated_at trigger helper
-- =====================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_campaigns_updated BEFORE UPDATE ON public.tontine_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_gateways_updated BEFORE UPDATE ON public.payment_gateways
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_ft_updated BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_delivery_updated BEFORE UPDATE ON public.delivery_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- new user trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================
-- Financial transaction auto-effects on APPROVAL
-- =====================
CREATE OR REPLACE FUNCTION public.apply_financial_transaction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance NUMERIC(14,2);
BEGIN
  -- RECHARGE approved: credit wallet
  IF NEW.type = 'RECHARGE' AND NEW.status = 'APPROVED' AND
     (OLD.status IS DISTINCT FROM 'APPROVED') THEN
    SELECT balance INTO current_balance FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
    IF NOT FOUND THEN
      INSERT INTO public.wallets (user_id, balance) VALUES (NEW.user_id, NEW.amount)
      ON CONFLICT (user_id) DO UPDATE SET balance = public.wallets.balance + EXCLUDED.balance;
      current_balance := NEW.amount;
    ELSE
      UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
      current_balance := current_balance + NEW.amount;
    END IF;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference, note)
    VALUES (NEW.user_id, 'CREDIT', NEW.amount, current_balance, NEW.transaction_reference, 'Recharge approuvée');
  END IF;

  -- WITHDRAWAL created (PENDING): freeze funds
  IF TG_OP = 'INSERT' AND NEW.type = 'WITHDRAWAL' AND NEW.status = 'PENDING' THEN
    SELECT balance INTO current_balance FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
    IF current_balance IS NULL OR current_balance < NEW.amount THEN
      RAISE EXCEPTION 'Solde insuffisant pour ce retrait';
    END IF;
    UPDATE public.wallets SET balance = balance - NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference, note)
    VALUES (NEW.user_id, 'DEBIT', NEW.amount, current_balance - NEW.amount, NEW.transaction_reference, 'Retrait en attente');
  END IF;

  -- WITHDRAWAL rejected after being pending: refund
  IF NEW.type = 'WITHDRAWAL' AND NEW.status = 'REJECTED' AND OLD.status = 'PENDING' THEN
    SELECT balance INTO current_balance FROM public.wallets WHERE user_id = NEW.user_id FOR UPDATE;
    UPDATE public.wallets SET balance = balance + NEW.amount, updated_at = now() WHERE user_id = NEW.user_id;
    INSERT INTO public.wallet_transactions (user_id, type, amount, balance_after, reference, note)
    VALUES (NEW.user_id, 'CREDIT', NEW.amount, current_balance + NEW.amount, NEW.transaction_reference, 'Retrait refusé — remboursement');
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_ft_insert
  AFTER INSERT ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_financial_transaction();
CREATE TRIGGER trg_ft_update
  AFTER UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.apply_financial_transaction();

-- =====================
-- REALTIME
-- =====================
ALTER PUBLICATION supabase_realtime ADD TABLE public.draw_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_participants;
ALTER PUBLICATION supabase_realtime ADD TABLE public.tontine_campaigns;
