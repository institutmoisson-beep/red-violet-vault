import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public server function: mints signed URLs for campaign cover images.
 * Campaign photos are public marketing assets, but the bucket stays private —
 * signing happens server-side with the service role so anonymous visitors
 * need no direct storage read permission.
 */
export const getCampaignImageUrls = createServerFn({ method: "POST" })
  .inputValidator((data) =>
    z
      .object({ keys: z.array(z.string().max(500)).max(50) })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: Record<string, string | null> = {};
    await Promise.all(
      data.keys.map(async (key) => {
        if (!key) {
          out[key] = null;
          return;
        }
        if (key.startsWith("http")) {
          out[key] = key;
          return;
        }
        const { data: signed, error } = await supabaseAdmin.storage
          .from("campaign-images")
          .createSignedUrl(key, 3600);
        out[key] = error || !signed?.signedUrl ? null : signed.signedUrl;
      }),
    );
    return out;
  });
