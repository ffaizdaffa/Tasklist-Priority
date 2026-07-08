"use client";
import { useEffect, useState } from "react";
import { deriveContent, seedRawRows, type RawRow } from "./normalize";
import type { ContentItem } from "./types";

// Client data layer. Renders the bundled seed instantly, then swaps to live
// data from /api/data (Supabase) once it loads — so pages need no loading
// states and just call useContent().

let _cache: ContentItem[] | null = null;
let _source: string = "seed";
let _promise: Promise<ContentItem[]> | null = null;

const seed = (): ContentItem[] => deriveContent(seedRawRows());

function load(): Promise<ContentItem[]> {
  if (_cache) return Promise.resolve(_cache);
  if (_promise) return _promise;
  _promise = fetch("/api/data")
    .then((r) => r.json())
    .then((j: { source: string; content: RawRow[] }) => {
      _source = j.source;
      _cache = deriveContent(j.content || []);
      return _cache;
    })
    .catch(() => {
      _source = "seed";
      _cache = seed();
      return _cache;
    });
  return _promise;
}

export function useContent(): ContentItem[] {
  const [items, setItems] = useState<ContentItem[]>(_cache ?? seed());
  useEffect(() => {
    let alive = true;
    load().then((c) => alive && setItems(c));
    return () => {
      alive = false;
    };
  }, []);
  return items;
}

export function useDataSource(): string {
  const [src, setSrc] = useState(_source);
  useEffect(() => {
    load().then(() => setSrc(_source));
  }, []);
  return src;
}
