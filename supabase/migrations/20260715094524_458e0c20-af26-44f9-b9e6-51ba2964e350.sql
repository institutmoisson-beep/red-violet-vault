ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kyc_reviewed_by uuid,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at timestamptz;

COMMENT ON COLUMN public.profiles.kyc_reviewed_by IS 'Administrator user id that last reviewed the KYC dossier.';
COMMENT ON COLUMN public.profiles.kyc_reviewed_at IS 'Timestamp of the last KYC review decision.';