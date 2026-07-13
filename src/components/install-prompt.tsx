import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "msn_pwa_install_dismissed_at";
const DISMISS_TTL_MS = 1000 * 60 * 60 * 24 * 7; // 7 jours

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
}

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);
  const [iosHint, setIosHint] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;

    const dismissedAt = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (dismissedAt && Date.now() - dismissedAt < DISMISS_TTL_MS) return;

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      setVisible(true);
    };

    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    // Fallback iOS (Safari ne déclenche jamais beforeinstallprompt)
    if (isIos()) {
      const t = setTimeout(() => {
        setIosHint(true);
        setVisible(true);
      }, 1500);
      return () => {
        clearTimeout(t);
        window.removeEventListener("beforeinstallprompt", onBeforeInstall);
        window.removeEventListener("appinstalled", onInstalled);
      };
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, String(Date.now()));
    setVisible(false);
  };

  const install = async () => {
    if (!deferred) return;
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "dismissed") {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      }
    } finally {
      setDeferred(null);
      setVisible(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Installer l'application MSN Tontine"
      className="fixed inset-x-0 bottom-4 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-border/60 bg-background/95 p-3 shadow-2xl backdrop-blur-xl sm:bottom-6"
      style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
    >
      <img
        src="/icon-192.png"
        alt=""
        width={48}
        height={48}
        className="h-12 w-12 shrink-0 rounded-xl shadow-brand"
      />
      <div className="min-w-0 flex-1">
        <div className="truncate font-display text-sm font-semibold text-foreground">
          Installer MSN Tontine
        </div>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {iosHint
            ? "Appuyez sur Partager puis « Sur l'écran d'accueil » pour installer."
            : "Ajoutez l'application à votre écran d'accueil pour un accès rapide."}
        </p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        {!iosHint && (
          <button
            onClick={install}
            className="rounded-lg bg-gradient-brand px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-brand"
          >
            Installer
          </button>
        )}
        <button
          onClick={dismiss}
          className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
        >
          Plus tard
        </button>
      </div>
    </div>
  );
}
