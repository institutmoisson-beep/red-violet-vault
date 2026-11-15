import { useEffect, useState } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";

export const PRESENCE_ROOM = "msn-online-users";

/** Logs page views/logins and announces the signed-in user as "online". */
export function ActivityTracker() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [uid, setUid] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUid(data.session?.user.id ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setUid(s?.user.id ?? null);
      if (event === "SIGNED_IN" && !sessionStorage.getItem("msn-login-logged")) {
        sessionStorage.setItem("msn-login-logged", "1");
        logActivity("login");
      }
      if (event === "SIGNED_OUT") sessionStorage.removeItem("msn-login-logged");
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (uid) logActivity("page_view", undefined, pathname);
  }, [uid, pathname]);

  useEffect(() => {
    if (!uid) return;
    const ch = supabase.channel(PRESENCE_ROOM, { config: { presence: { key: uid } } });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") ch.track({ user_id: uid, since: new Date().toISOString() });
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid]);

  return null;
}
