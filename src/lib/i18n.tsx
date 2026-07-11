import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";
export type Currency = "XOF" | "EUR" | "USD" | "USDT";

const dict = {
  fr: {
    nav_tontines: "Tontines",
    nav_how: "Comment ça marche",
    nav_trust: "Sécurité",
    nav_wallet: "Portefeuille",
    nav_dashboard: "Tableau de bord",
    nav_admin: "Admin",
    nav_signin: "Se connecter",
    nav_signup: "Commencer",
    nav_signout: "Déconnexion",
    signin_title: "Connexion à MSN Tontine",
    signin_sub: "Accédez à votre portefeuille et vos tontines",
    signup_title: "Créer votre compte",
    signup_sub: "Rejoignez la tontine intelligente",
    email: "E-mail",
    password: "Mot de passe",
    first_name: "Prénom",
    last_name: "Nom",
    login: "Se connecter",
    signup: "S'inscrire",
    continue_google: "Continuer avec Google",
    or: "ou",
    kyc_title: "Vérification d'identité",
    kyc_sub: "Complétez votre profil pour rejoindre des tontines",
    kyc_step1: "Identité",
    kyc_step2: "Documents",
    kyc_step3: "Localisation",
    kyc_dob: "Date de naissance",
    kyc_phone: "Téléphone",
    kyc_whatsapp: "WhatsApp",
    kyc_avatar: "Photo de profil",
    kyc_id_recto: "Pièce d'identité (recto)",
    kyc_id_verso: "Pièce d'identité (verso)",
    kyc_geo: "Autoriser la géolocalisation",
    kyc_geo_captured: "Position capturée",
    kyc_submit: "Soumettre pour vérification",
    kyc_pending: "Vérification en attente",
    kyc_verified: "Compte vérifié ✓",
    kyc_rejected: "Vérification refusée",
    wallet_title: "MSN Wallet",
    wallet_balance: "Solde disponible",
    wallet_recharge: "Recharger",
    wallet_withdraw: "Retirer",
    wallet_history: "Historique",
    checkout_title: "MSN Smart Checkout",
    checkout_amount: "Montant",
    checkout_method: "Méthode de paiement",
    checkout_pay_now: "Payer maintenant",
    checkout_ref: "Référence de transaction",
    checkout_upload_proof: "Justificatif (optionnel)",
    checkout_submit: "Soumettre pour vérification",
    withdraw_amount: "Montant du retrait",
    withdraw_channel: "Canal de réception",
    withdraw_account: "Numéro / adresse",
    withdraw_request: "Demander le retrait",
    campaigns_title: "Tontines ouvertes",
    campaigns_all: "Toutes",
    join_tontine: "Rejoindre cette tontine",
    join_requires_verified: "Vérification requise",
    join_requires_balance: "Solde insuffisant",
    participants: "Participants",
    cycles: "Cycles",
    next_draw: "Prochain tirage",
    draw_history: "Historique des tirages",
    winner: "Gagnant",
    cycle: "Cycle",
    admin_title: "Console admin",
    admin_kyc_queue: "File KYC",
    admin_gateways: "Passerelles",
    admin_campaigns: "Campagnes",
    admin_transactions: "Transactions",
    admin_draws: "Tirages",
    admin_approve: "Approuver",
    admin_reject: "Rejeter",
    admin_run_draw: "Exécuter le tirage",
    admin_create_campaign: "Créer une campagne",
    live_draw_title: "Tirage en direct",
    live_draw_waiting: "En attente du tirage...",
    live_draw_congrats: "Félicitations",
    common_loading: "Chargement...",
    common_save: "Enregistrer",
    common_cancel: "Annuler",
    common_close: "Fermer",
  },
  en: {
    nav_tontines: "Tontines",
    nav_how: "How it works",
    nav_trust: "Security",
    nav_wallet: "Wallet",
    nav_dashboard: "Dashboard",
    nav_admin: "Admin",
    nav_signin: "Sign in",
    nav_signup: "Get started",
    nav_signout: "Sign out",
    signin_title: "Sign in to MSN Tontine",
    signin_sub: "Access your wallet and tontines",
    signup_title: "Create your account",
    signup_sub: "Join the smart tontine network",
    email: "Email",
    password: "Password",
    first_name: "First name",
    last_name: "Last name",
    login: "Sign in",
    signup: "Sign up",
    continue_google: "Continue with Google",
    or: "or",
    kyc_title: "Identity verification",
    kyc_sub: "Complete your profile to join tontines",
    kyc_step1: "Identity",
    kyc_step2: "Documents",
    kyc_step3: "Location",
    kyc_dob: "Date of birth",
    kyc_phone: "Phone",
    kyc_whatsapp: "WhatsApp",
    kyc_avatar: "Profile picture",
    kyc_id_recto: "ID card (front)",
    kyc_id_verso: "ID card (back)",
    kyc_geo: "Allow geolocation",
    kyc_geo_captured: "Location captured",
    kyc_submit: "Submit for verification",
    kyc_pending: "Pending verification",
    kyc_verified: "Verified account ✓",
    kyc_rejected: "Verification rejected",
    wallet_title: "MSN Wallet",
    wallet_balance: "Available balance",
    wallet_recharge: "Top up",
    wallet_withdraw: "Withdraw",
    wallet_history: "History",
    checkout_title: "MSN Smart Checkout",
    checkout_amount: "Amount",
    checkout_method: "Payment method",
    checkout_pay_now: "Pay now",
    checkout_ref: "Transaction reference",
    checkout_upload_proof: "Proof (optional)",
    checkout_submit: "Submit for verification",
    withdraw_amount: "Withdrawal amount",
    withdraw_channel: "Receiving channel",
    withdraw_account: "Number / address",
    withdraw_request: "Request withdrawal",
    campaigns_title: "Open tontines",
    campaigns_all: "All",
    join_tontine: "Join this tontine",
    join_requires_verified: "Verification required",
    join_requires_balance: "Insufficient balance",
    participants: "Participants",
    cycles: "Cycles",
    next_draw: "Next draw",
    draw_history: "Draw history",
    winner: "Winner",
    cycle: "Cycle",
    admin_title: "Admin console",
    admin_kyc_queue: "KYC queue",
    admin_gateways: "Gateways",
    admin_campaigns: "Campaigns",
    admin_transactions: "Transactions",
    admin_draws: "Draws",
    admin_approve: "Approve",
    admin_reject: "Reject",
    admin_run_draw: "Run draw",
    admin_create_campaign: "Create campaign",
    live_draw_title: "Live draw",
    live_draw_waiting: "Waiting for draw...",
    live_draw_congrats: "Congratulations",
    common_loading: "Loading...",
    common_save: "Save",
    common_cancel: "Cancel",
    common_close: "Close",
  },
} as const;

export type TKey = keyof (typeof dict)["fr"];

type Ctx = {
  lang: Lang;
  currency: Currency;
  setLang: (l: Lang) => void;
  setCurrency: (c: Currency) => void;
  t: (k: TKey) => string;
};

const I18nCtx = createContext<Ctx | null>(null);

const RATES: Record<Currency, number> = {
  XOF: 1,
  EUR: 1 / 655.957,
  USD: 1 / 600,
  USDT: 1 / 600,
};

export function convertFromXOF(amountXOF: number, target: Currency): number {
  return amountXOF * RATES[target];
}

export function formatMoney(amountXOF: number, currency: Currency, lang: Lang): string {
  const converted = convertFromXOF(amountXOF, currency);
  if (currency === "XOF") {
    return `${Math.round(converted).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")} F CFA`;
  }
  if (currency === "USDT") return `${converted.toFixed(2)} USDT`;
  return new Intl.NumberFormat(lang === "fr" ? "fr-FR" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(converted);
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");
  const [currency, setCurrencyState] = useState<Currency>("XOF");

  useEffect(() => {
    const l = (typeof window !== "undefined" && localStorage.getItem("msn_lang")) as Lang | null;
    const c = (typeof window !== "undefined" && localStorage.getItem("msn_currency")) as Currency | null;
    if (l === "fr" || l === "en") setLangState(l);
    if (c === "XOF" || c === "EUR" || c === "USD" || c === "USDT") setCurrencyState(c);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    if (typeof window !== "undefined") localStorage.setItem("msn_lang", l);
  };
  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    if (typeof window !== "undefined") localStorage.setItem("msn_currency", c);
  };

  const value = useMemo<Ctx>(
    () => ({
      lang,
      currency,
      setLang,
      setCurrency,
      t: (k) => dict[lang][k] ?? dict.fr[k] ?? k,
    }),
    [lang, currency],
  );

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nCtx);
  if (!ctx) throw new Error("useI18n outside provider");
  return ctx;
}
