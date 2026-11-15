import { supabase } from "@/integrations/supabase/client";

export async function logActivity(event_type: string, detail?: string, path?: string) {
  try {
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user.id;
    if (!uid) return;
    await (supabase.from as any)("user_activity").insert({
      user_id: uid,
      event_type: event_type.slice(0, 40),
      detail: detail?.slice(0, 500) ?? null,
      path: (path ?? (typeof window !== "undefined" ? window.location.pathname : null))?.slice(0, 300) ?? null,
    });
  } catch {
    /* best effort */
  }
}
