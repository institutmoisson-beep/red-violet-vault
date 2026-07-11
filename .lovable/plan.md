## MSN Tontine — Build Plan

A social e-commerce tontine platform for L'Institut Moisson. Given the scope, I'll build in phases and confirm direction before wiring backend + AI.

### Phase 1 — Foundation & Design System (this turn)
- Update `src/styles.css` with brand tokens: Deep Red `#D32F2F`, Rich Violet `#7B1FA2`, Charcoal `#111111` (oklch), fintech typography (Space Grotesk + Inter), gradient/shadow tokens.
- Update `__root.tsx` head metadata (title: "MSN Tontine — L'Institut Moisson", description, OG).
- Build public landing (`/`) — hero, brand authority, how-it-works (6-step tontine cycle), category grid with iconography, trust/transparency section, CTA to register.
- Add routes shell: `/auth`, `/campaigns`, `/campaigns/$id`, `/dashboard`, `/wallet`, `/verify`, `/admin` (placeholders wired for Phase 3).
- Global header/footer with MSN branding.

### Phase 2 — Backend (Lovable Cloud)
Enable Cloud, then migrations for:
- `profiles` (KYC: names, DOB, phone, whatsapp, avatar, id_recto/verso URLs, lat/lng, status enum `PENDING_VERIFICATION`/`VERIFIED`/`REJECTED`).
- `user_roles` + `app_role` enum (`admin`, `user`) + `has_role()` security-definer.
- `tontine_categories` (seeded: Alimentaire, Vivrier, Électroménager, Électrotechnique, Machines & Outils, Moto & Voiture, Divertissement).
- `tontine_campaigns` (title, description, images[], total_price, installment_price, max_participants, current_participants_count, frequency_days, start/end dates, draw_hour, next_draw_timestamp, category_id, status).
- `tontine_participants` (user_id, campaign_id, unique_draw_code, has_won, draw_win_cycle_number, joined_at).
- `tontine_payments_ledger` (user_id, campaign_id, amount, status, payment_timestamp, cycle_number).
- `wallets` (user_id, balance) + `wallet_transactions` (credit/debit ledger).
- `draw_events` (campaign_id, cycle_number, winner_user_id, executed_at) for transparency ledger.
- `delivery_orders` (winner_id, campaign_id, shipping_address, status, deadline_at).
- Storage buckets: `avatars` (public), `id-documents` (private, owner-only RLS).
- RLS on every table + explicit GRANTs.

### Phase 3 — Features
- Auth (email/password + Google) with post-signup KYC wizard (`/verify`): identity → documents → live geolocation → submit.
- Campaign browser (category filter, search, progress bars, participant avatars).
- Campaign detail: join CTA (gated on VERIFIED + wallet balance), participant list, draw history ledger, countdown to next draw.
- MSN Wallet UI: balance card, top-up (simulated), transaction history, scheduled debits view.
- Admin dashboard: verification queue (ID recto/verso side-by-side + Leaflet map of GPS point), campaign creator, campaigns manager, draws log.
- Realtime draw reveal screen: Supabase Realtime channel subscription → full-screen animated reveal of winner (avatar, real name, draw code) with confetti.
- Automated draw engine: TanStack server function invoked by pg_cron on `next_draw_timestamp`, picks eligible participant (has_won=false), inserts `draw_events`, flags participant, broadcasts on realtime channel, creates `delivery_orders` row (48h deadline), continues installment debits for all participants (including past winners) until final cycle.
- Installment auto-debit: pg_cron hourly job scanning due participants, debits wallet, inserts ledger row, sends alert on insufficient funds.

### Phase 4 — AI (Lovable AI Gateway)
- **Anti-Fraud Guard**: server function on KYC submission → Gemini analyzes name+ID text OCR + checks DB for duplicate ID hashes / clustered GPS / similar names → returns risk score shown in admin queue.
- **Community Broadcaster**: server function post-draw → Gemini generates French celebration copy → stored on `draw_events.broadcast_text` for admin to copy/share.

### Notifications
SMS/WhatsApp alerts: stub with in-app toasts + wallet notification records first; real SMS requires a connector (Twilio/GatewayAPI) — I'll ask before wiring.

### Open questions before Phase 2+
1. Payment top-up: real Stripe/mobile-money integration now, or simulated wallet top-up (admin-credit) for MVP?
2. SMS/WhatsApp alerts: connect Twilio/GatewayAPI now, or in-app only for MVP?
3. Language: French-only UI, or French + English toggle?
4. Currency display: XOF (F CFA) only?

### Deliverable this turn
Phase 1 only — brand design system, landing page, routes scaffold, header/footer. I'll pause after to confirm the 4 questions before enabling Cloud and building the backend.
