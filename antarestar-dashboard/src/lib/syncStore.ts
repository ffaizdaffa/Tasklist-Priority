import { ACTORS, apifyConfigured } from "./apify";
import { getContent } from "./normalize";
import type { SyncSource } from "./types";

// In-memory sync state + error log. In production this would persist to
// Supabase (see supabase/schema.sql), but this keeps the app self-contained.

export interface SyncLogEntry {
  ts: string;
  source: string;
  level: "info" | "error";
  message: string;
}

interface GlobalStore {
  sources: Record<string, SyncSource>;
  log: SyncLogEntry[];
}

const g = globalThis as unknown as { __antStore?: GlobalStore };

function seedStore(): GlobalStore {
  const content = getContent();
  const sources: Record<string, SyncSource> = {};
  for (const a of ACTORS) {
    const items = content.filter((c) => c.platform === a.platform).length;
    sources[a.key] = {
      key: a.key,
      label: a.label,
      actorId: a.actorId,
      platform: a.platform,
      lastSync: content[0]?.publishDate || null,
      status: "ok",
      items,
      error: null,
    };
  }
  return {
    sources,
    log: [
      {
        ts: content[0]?.publishDate || new Date(0).toISOString(),
        source: "system",
        level: "info",
        message: apifyConfigured()
          ? "Apify token detected — live sync enabled."
          : "Running on bundled seed data. Add APIFY_TOKEN to enable live sync.",
      },
    ],
  };
}

export function store(): GlobalStore {
  return (g.__antStore ??= seedStore());
}

export function pushLog(e: Omit<SyncLogEntry, "ts">, ts: string) {
  const s = store();
  s.log.unshift({ ...e, ts });
  s.log = s.log.slice(0, 100);
}

export function setSource(key: string, patch: Partial<SyncSource>) {
  const s = store();
  if (s.sources[key]) Object.assign(s.sources[key], patch);
}
