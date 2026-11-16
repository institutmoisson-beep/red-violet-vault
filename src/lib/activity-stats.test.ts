/// <reference types="bun" />
import { expect, test } from "bun:test";
import { activityStats, readAllPages, type ActivityRecord } from "./activity-stats";

const now = new Date("2026-11-16T09:20:00Z");
const event = (id: string, user_id: string, created_at: string, event_type = "page_view"): ActivityRecord => ({ id, user_id, created_at, event_type, path: null, detail: null });

test("today counts only this UTC day and counts each active member once", () => {
  const stats = activityStats([
    event("1", "a", "2026-11-16T00:00:00Z"),
    event("2", "a", "2026-11-16T09:00:00Z", "search"),
    event("3", "b", "2026-11-15T23:59:59Z"),
    event("4", "c", "2026-11-17T00:00:00Z"),
  ], now);
  expect(stats[0]).toEqual({ label: "Aujourd'hui", users: 1, logins: 0, views: 1, searches: 1 });
});

test("week, month and year include their own reporting windows", () => {
  const stats = activityStats([
    event("1", "week", "2026-11-09T09:20:00Z", "login"),
    event("2", "month", "2026-10-17T09:20:00Z", "search"),
    event("3", "year", "2025-11-16T09:20:00Z"),
    event("4", "old", "2025-11-16T09:19:59Z"),
  ], now);
  expect(stats[1].users).toBe(1);
  expect(stats[2].users).toBe(2);
  expect(stats[3].users).toBe(3);
});

test("user and activity lists fetch beyond the 1000 row API limit", async () => {
  const all = Array.from({ length: 2107 }, (_, id) => ({ id }));
  const result = await readAllPages((start, end) => Promise.resolve({ data: all.slice(start, end + 1), error: null }));
  expect(result.length).toBe(2107);
  expect(result[2106].id).toBe(2106);
});

test("failed activity reads are not displayed as zero activity", async () => {
  await expect(readAllPages(() => Promise.resolve({ data: null, error: { message: "Access denied" } }))).rejects.toThrow("Access denied");
});