export type ActivityRecord = { id: string; user_id: string; event_type: string; path: string | null; detail: string | null; created_at: string };

/** Reporting boundaries use Abidjan/UTC, with rolling week/month/year windows. */
export function activityPeriods(now = new Date()) {
  const today = new Date(now);
  today.setUTCHours(0, 0, 0, 0);
  const year = new Date(now);
  year.setUTCFullYear(year.getUTCFullYear() - 1);
  return [
    { label: "Aujourd'hui", since: today.getTime() },
    { label: "7 jours", since: now.getTime() - 7 * 864e5 },
    { label: "30 jours", since: now.getTime() - 30 * 864e5 },
    { label: "12 mois", since: year.getTime() },
  ];
}

export function activityStats(events: ActivityRecord[], now = new Date()) {
  return activityPeriods(now).map(({ label, since }) => {
    const within = events.filter((event) => {
      const time = new Date(event.created_at).getTime();
      return time >= since && time <= now.getTime();
    });
    return {
      label,
      users: new Set(within.map((event) => event.user_id)).size,
      logins: within.filter((event) => event.event_type === "login").length,
      views: within.filter((event) => event.event_type === "page_view").length,
      searches: within.filter((event) => event.event_type === "search").length,
    };
  });
}

export async function readAllPages<T>(read: (start: number, end: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>): Promise<T[]> {
  const rows: T[] = [];
  for (let start = 0; ; start += 1000) {
    const { data, error } = await read(start, start + 999);
    if (error) throw new Error(error.message);
    rows.push(...(data ?? []));
    if (!data || data.length < 1000) return rows;
  }
}