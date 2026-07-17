import { useState } from "react";
import { formatMoney, type Currency, type Lang } from "@/lib/i18n";

type ShareCampaign = {
  id: string;
  title: string;
  installment_price: number;
  total_price: number;
  images?: string[] | null;
};

function buildShareText(c: ShareCampaign, currency: Currency, lang: Lang) {
  const price = formatMoney(Number(c.installment_price), currency, lang);
  const total = formatMoney(Number(c.total_price), currency, lang);
  return `🌾 ${c.title} — Rejoignez cette tontine MSN !\n💰 Cotisation : ${price} · Valeur : ${total}\nRejoignez-nous 👇`;
}

function shareUrlFor(campaignId: string) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/campaigns/${campaignId}`;
}

/**
 * Bouton de partage social pour une tontine. Sur mobile, utilise le
 * partage natif du système (Web Share API) qui propose directement
 * WhatsApp, Facebook, Instagram, TikTok, etc. selon les apps installées.
 * En repli (desktop / navigateur non compatible), affiche des liens de
 * partage directs + copie du lien.
 */
export function ShareButton({
  campaign,
  currency,
  lang,
  className,
}: {
  campaign: ShareCampaign;
  currency: Currency;
  lang: Lang;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = shareUrlFor(campaign.id);
  const text = buildShareText(campaign, currency, lang);
  const image = campaign.images?.[0];

  async function nativeShare(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ title: campaign.title, text, url });
        return;
      } catch {
        // annulé par l'utilisateur ou non supporté : on ouvre le menu de repli
      }
    }
    setOpen((v) => !v);
  }

  function copyLink(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard?.writeText(`${text}\n${url}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const links = [
    {
      label: "WhatsApp",
      emoji: "🟢",
      href: `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`,
    },
    {
      label: "Facebook",
      emoji: "🔵",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    },
    {
      label: "X / Twitter",
      emoji: "⚫",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
    },
    {
      label: "Telegram",
      emoji: "🔷",
      href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`,
    },
  ];

  return (
    <div className={`relative ${className ?? ""}`} onClick={(e) => e.stopPropagation()}>
      <button
        onClick={nativeShare}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-3 py-1.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
        aria-label="Partager cette tontine"
      >
        📤 Partager
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-card p-2 shadow-brand">
            {image && (
              <img
                src={image}
                alt=""
                className="mb-2 aspect-video w-full rounded-lg object-cover"
              />
            )}
            <div className="mb-1 px-1 text-[10px] uppercase tracking-wider text-muted-foreground">
              Partager sur…
            </div>
            {links.map((l) => (
              <a
                key={l.label}
                href={l.href}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="flex items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted"
              >
                <span>{l.emoji}</span> {l.label}
              </a>
            ))}
            <div className="flex items-center gap-2 rounded-md px-2 py-2 text-sm">
              <span>📸</span>
              <span className="text-muted-foreground">
                Instagram / TikTok : copiez le lien ci-dessous
              </span>
            </div>
            <button
              onClick={copyLink}
              className="mt-1 flex w-full items-center gap-2 rounded-md bg-gradient-brand px-2 py-2 text-sm font-semibold text-primary-foreground"
            >
              🔗 {copied ? "Lien copié !" : "Copier le lien"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
