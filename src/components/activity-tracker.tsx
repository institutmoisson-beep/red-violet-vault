import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { logActivity } from "@/lib/activity";

export const PRESENCE_ROOM = "msn-online-users";
const OnlineUsersContext = createContext<string[]>([]);
export const useOnlineUsers = () => useContext(OnlineUsersContext);

/** Logs page views/logins and announces the signed-in user as "online". */
export function ActivityTracker({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [uid, setUid] = useState<string | null>(null);
  const [online, setOnline] = useState<string[]>([]);

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
    setOnline([]);
    if (!uid) return;
    const ch = supabase.channel(PRESENCE_ROOM, { config: { presence: { key: uid } } });
    ch.on("presence", { event: "sync" }, () => {
      setOnline([...new Set(Object.values(ch.presenceState<{ user_id: string }>()).flat().map((p) => p.user_id).filter(Boolean))]);
    });
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") ch.track({ user_id: uid, since: new Date().toISOString() });
    });
    return () => {
      supabase.removeChannel(ch);
    };
  }, [uid]);

  return <OnlineUsersContext.Provider value={online}>{children}</OnlineUsersContext.Provider>;
}
