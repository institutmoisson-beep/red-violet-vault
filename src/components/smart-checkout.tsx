import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useProfile } from "@/hooks/use-auth";
import { useI18n, formatMoney } from "@/lib/i18n";
import { uploadFile } from "@/lib/storage";

type Gateway = {
  id: string;
  method_name: string;
  method_key: string;
  provider: string;
  account_details: string | null;
  ussd_template_syntax: string | null;
  deep_link_template: string | null;
};

export function SmartCheckout({
  defaultAmount,
  campaignId,
  onSubmitted,
}: {
  defaultAmount?: number;
  campaignId?: string;
  onSubmitted?: () => void;
}) {
  const { t, lang, currency } = useI18n();
  const { user } = useProfile();
  const [gateways, setGateways] = useState<Gateway[]>([]);
  const [amount, setAmount] = useState(defaultAmount ?? 5000);
  const [selected, setSelected] = useState<Gateway | null>(null);
  const [reference, setReference] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase
      .from("payment_gateways")
      .select("*")
      .eq("is_active", true)
      .eq("supports_recharge", true)
      .then(({ data }) => setGateways((data ?? []) as Gateway[]));
  }, []);

  function compileUssd(template: string): string {
    return template
      .replace("{{AMOUNT}}", String(amount))
      .replace("{{ACCOUNT}}", selected?.account_details ?? "")
      .replace("{{PHONE}}", phone || "{{PHONE}}")
      .replace("{{PIN}}", "PIN");
  }
  function compileDeepLink(template: string): string {
    return template.replace("{{AMOUNT}}", String(amount)).replace("{{ACCOUNT}}", selected?.account_details ?? "");
  }

  async function submit() {
    if (!user || !selected) return;
    if (!reference.trim()) {
      toast.error(lang === "fr" ? "Référence requise" : "Reference required");
      return;
    }
    setBusy(true);
    try {
      let proofPath: string | null = null;
      if (proofFile) {
        proofPath = `${user.id}/proof-${Date.now()}.${proofFile.name.split(".").pop()}`;
        await uploadFile("payment-proofs", proofPath, proofFile);
      }
      const { error } = await supabase.from("financial_transactions").insert({
        user_id: user.id,
        type: campaignId ? "PURCHASE" : "RECHARGE",
        amount,
        currency: "XOF",
        payment_method: selected.method_key,
        gateway_id: selected.id,
        transaction_reference: reference,
        proof_screenshot_url: proofPath,
        associated_campaign_id: campaignId ?? null,
        status: "PENDING",
      });
      if (error) throw error;
      toast.success(lang === "fr" ? "Paiement soumis pour vérification" : "Payment submitted for review");
      setReference("");
      setProofFile(null);
      setSelected(null);
      onSubmitted?.();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-red">
            {t("checkout_title")}
          </div>
          <div className="mt-1 font-display text-lg font-bold">
            {campaignId ? (lang === "fr" ? "Paiement produit" : "Product payment") : t("wallet_recharge")}
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t("checkout_amount")}</div>
          <div className="font-display text-2xl font-bold text-gradient-brand">{formatMoney(amount, currency, lang)}</div>
        </div>
      </div>

      {!campaignId && (
        <input
          type="number"
          min={500}
          step={500}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-4 w-full rounded-md border border-border bg-background px-3 py-2.5 text-sm"
        />
      )}

      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {gateways.map((g) => (
          <button
            key={g.id}
            onClick={() => setSelected(g)}
            className={`rounded-xl border p-3 text-left text-sm transition-all ${
              selected?.id === g.id
                ? "border-brand-red bg-gradient-brand-soft shadow-brand"
                : "border-border bg-background/60 hover:border-brand-red/40"
            }`}
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground">{g.provider}</div>
            <div className="mt-1 font-semibold">{g.method_name}</div>
          </button>
        ))}
      </div>

      {selected && (
        <div className="mt-6 space-y-3 rounded-xl border border-brand-violet/30 bg-brand-violet/5 p-4">
          <div className="text-xs uppercase tracking-wider text-brand-violet">Instructions</div>
          {selected.provider === "mobile_money" && (
            <>
              <div className="text-sm">
                Envoyer <span className="font-bold text-gradient-brand">{formatMoney(amount, currency, lang)}</span> au{" "}
                <span className="font-mono">{selected.account_details}</span>
              </div>
              {selected.deep_link_template && (
                <a
                  href={compileDeepLink(selected.deep_link_template)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center rounded-md bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  Ouvrir {selected.method_name} →
                </a>
              )}
              {selected.ussd_template_syntax && (
                <>
                  <input
                    placeholder={lang === "fr" ? "Votre numéro" : "Your phone"}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  />
                  <div className="flex items-center gap-2 rounded-md bg-background/80 px-3 py-2 font-mono text-sm">
                    <span className="flex-1 select-all">{compileUssd(selected.ussd_template_syntax)}</span>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(compileUssd(selected.ussd_template_syntax!));
                        toast.success("Copié");
                      }}
                      className="rounded bg-brand-red px-2 py-1 text-xs font-semibold text-primary-foreground"
                    >
                      Copier
                    </button>
                  </div>
                </>
              )}
            </>
          )}
          {selected.provider === "crypto" && (
            <>
              <div className="text-sm">
                {lang === "fr" ? "Envoyez à cette adresse :" : "Send to this address:"}
              </div>
              <div className="break-all rounded-md bg-background/80 px-3 py-2 font-mono text-xs">
                {selected.account_details}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selected.account_details ?? "");
                  toast.success("Copié");
                }}
                className="rounded-md bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground"
              >
                Copier l'adresse
              </button>
            </>
          )}
          {selected.provider === "card" && (
            <div className="text-sm text-muted-foreground">
              {lang === "fr"
                ? "Contactez le support pour un virement bancaire manuel."
                : "Contact support for a manual bank transfer."}
            </div>
          )}

          <div className="pt-2">
            <input
              placeholder={t("checkout_ref")}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
            />
            <label className="mt-2 block text-xs text-muted-foreground">
              {t("checkout_upload_proof")}
              <input type="file" accept="image/*" onChange={(e) => setProofFile(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-xs" />
            </label>
          </div>

          <button
            disabled={busy}
            onClick={submit}
            className="mt-2 w-full rounded-lg bg-gradient-brand px-4 py-3 text-sm font-semibold text-primary-foreground shadow-brand disabled:opacity-50"
          >
            {busy ? "…" : t("checkout_submit")}
          </button>
        </div>
      )}
    </div>
  );
}
