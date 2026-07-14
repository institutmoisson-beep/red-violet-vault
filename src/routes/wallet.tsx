import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-auth";
import { useI18n, formatMoney } from "@/lib/i18n";
import { RequireAuth } from "@/components/app-shell";
import { SmartCheckout } from "@/components/smart-checkout";

export const Route = createFileRoute("/wallet")({
  component: () => (
    <RequireAuth>
      <WalletPage />
    </RequireAuth>
  ),
});

type Wallet = { balance: number; currency: string; debt: number };
type Tx = {
  id: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  balance_after: number;
  note: string | null;
  created_at: string;
};
type FT = {
  id: string;
  type: string;
  amount: number;
  status: string;
  payment_method: string | null;
  transaction_reference: string | null;
  created_at: string;
};

function WalletPage() {
  const { t, lang, currency } = useI18n();
  const { user } = useProfile();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletTxs, setWalletTxs] = useState<Tx[]>([]);
  const [fts, setFts] = useState<FT[]>([]);
  const [tab, setTab] = useState<"recharge" | "withdraw" | "history">("recharge");

  async function refresh() {
    if (!user) return;
    const [{ data: w }, { data: tx }, { data: f }] = await Promise.all([
      supabase.from("wallets").select("*").eq("user_id", user.id).maybeSingle(),
      supabase.from("wallet_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
      supabase.from("financial_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);
    setWallet(w as Wallet | null);
    setWalletTxs((tx ?? []) as Tx[]);
    setFts((f ?? []) as FT[]);
  }

  useEffect(() => {
    refresh();
  }, [user?.id]);

  const balance = Number(wallet?.balance ?? 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
        {t("wallet_title")}
      </div>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{t("wallet_balance")}</h1>

      <div className="mt-6 rounded-3xl border border-border bg-gradient-brand-soft p-8">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("wallet_balance")}</div>
        <div className="mt-2 font-display text-5xl font-bold text-gradient-brand">
          {formatMoney(balance, currency, lang)}
        </div>
      </div>

      <div className="mt-8 flex gap-1 rounded-lg border border-border bg-card/60 p-1 text-sm">
        {(["recharge", "withdraw", "history"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`flex-1 rounded-md px-3 py-2 font-medium transition-all ${
              tab === k ? "bg-gradient-brand text-primary-foreground shadow-brand" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {k === "recharge" ? t("wallet_recharge") : k === "withdraw" ? t("wallet_withdraw") : t("wallet_history")}
          </button>
        ))}
      </div>

      <div className="mt-6">
        {tab === "recharge" && <SmartCheckout onSubmitted={refresh} />}
        {tab === "withdraw" && <WithdrawForm balance={balance} onDone={refresh} />}
        {tab === "history" && (
          <div className="space-y-6">
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mouvements de portefeuille
              </div>
              <div className="divide-y divide-border rounded-xl border border-border bg-card/60">
                {walletTxs.length === 0 && <div className="p-6 text-sm text-muted-foreground">Aucun mouvement</div>}
                {walletTxs.map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <div className="font-medium">{tx.note ?? tx.type}</div>
                      <div className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleString()}</div>
                    </div>
                    <div className={`font-mono font-bold ${tx.type === "CREDIT" ? "text-brand-violet" : "text-brand-red"}`}>
                      {tx.type === "CREDIT" ? "+" : "−"}
                      {formatMoney(Number(tx.amount), currency, lang)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Demandes de paiement
              </div>
              <div className="divide-y divide-border rounded-xl border border-border bg-card/60">
                {fts.length === 0 && <div className="p-6 text-sm text-muted-foreground">Aucune demande</div>}
                {fts.map((f) => (
                  <div key={f.id} className="flex items-center justify-between p-4 text-sm">
                    <div>
                      <div className="font-medium">
                        {f.type} · {f.payment_method}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {f.transaction_reference ?? "—"} · {new Date(f.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="font-mono">{formatMoney(Number(f.amount), currency, lang)}</div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          f.status === "APPROVED" || f.status === "DISBURSED"
                            ? "bg-brand-violet/20 text-brand-violet"
                            : f.status === "REJECTED"
                              ? "bg-destructive/20 text-destructive"
                              : "bg-brand-red/20 text-brand-red"
                        }`}
                      >
                        {f.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function WithdrawForm({ balance, onDone }: { balance: number; onDone: () => void }) {
  const { t, lang, currency } = useI18n();
  const { user } = useProfile();
  const [gateways, setGateways] = useState<{ id: string; method_name: string; method_key: string }[]>([]);
  const [amount, setAmount] = useState(1000);
  const [gatewayId, setGatewayId] = useState("");
  const [dest, setDest] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("payment_gateways")
      .select("id, method_name, method_key")
      .eq("is_active", true)
      .eq("supports_withdrawal", true)
      .then(({ data }) => setGateways(data ?? []));
  }, []);

  async function submit() {
    if (!user) return;
    if (amount > balance) return toast.error("Solde insuffisant");
    if (!gatewayId || !dest) return toast.error("Renseignez la méthode et le destinataire");
    setBusy(true);
    try {
      const { error } = await supabase.from("financial_transactions").insert({
        user_id: user.id,
        type: "WITHDRAWAL",
        amount,
        currency: "XOF",
        gateway_id: gatewayId,
        destination_details: dest,
        status: "PENDING",
      });
      if (error) throw error;
      toast.success(lang === "fr" ? "Demande de retrait envoyée" : "Withdrawal requested");
      setDest("");
      onDone();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("withdraw_amount")}</div>
      <input
        type="number"
        min={500}
        max={balance}
        value={amount}
        onChange={(e) => setAmount(Number(e.target.value))}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
      />
      <div className="mt-1 text-xs text-muted-foreground">
        Solde disponible : {formatMoney(balance, currency, lang)}
      </div>
      <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{t("withdraw_channel")}</div>
      <select
        value={gatewayId}
        onChange={(e) => setGatewayId(e.target.value)}
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
      >
        <option value="">—</option>
        {gateways.map((g) => (
          <option key={g.id} value={g.id}>
            {g.method_name}
          </option>
        ))}
      </select>
      <div className="mt-4 text-xs uppercase tracking-wider text-muted-foreground">{t("withdraw_account")}</div>
      <input
        value={dest}
        onChange={(e) => setDest(e.target.value)}
        placeholder="+225 07 00 00 00 00"
        className="mt-2 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
      />
      <button
        disabled={busy}
        onClick={submit}
        className="mt-6 w-full rounded-lg bg-gradient-brand px-4 py-3 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
      >
        {busy ? "…" : t("withdraw_request")}
      </button>
    </div>
  );
}
