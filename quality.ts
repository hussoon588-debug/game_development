"use client";

import { useEffect, useState } from "react";

export type Quality = "low" | "medium" | "high";

export type Prefs = {
  quality: Quality;
  sound: boolean;
  haptics: boolean;
  tilt: boolean;
  avatars: boolean;
};

const STORAGE_KEY = "city-realism-prefs-v1";
const EVENT = "city-prefs";

export const DEFAULT_PREFS: Prefs = {
  quality: "medium",
  sound: false,
  haptics: true,
  tilt: true,
  avatars: true,
};

export function readPrefs(): Prefs {
  if (typeof window === "undefined") return DEFAULT_PREFS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PREFS;
    const parsed = JSON.parse(raw) as Partial<Prefs>;
    return {
      quality: parsed.quality === "low" || parsed.quality === "high" ? parsed.quality : "medium",
      sound: Boolean(parsed.sound),
      haptics: parsed.haptics !== false,
      tilt: parsed.tilt !== false,
      avatars: parsed.avatars !== false,
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function savePrefs(patch: Partial<Prefs>): Prefs {
  const next = { ...readPrefs(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
    } catch {
      // ignore storage errors
    }
  }
  return next;
}

export function usePrefs() {
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setPrefs(readPrefs());
    setReady(true);
    const handler = (event: Event) => {
      const custom = event as CustomEvent<Prefs>;
      if (custom.detail) setPrefs(custom.detail);
      else setPrefs(readPrefs());
    };
    window.addEventListener(EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener(EVENT, handler);
      window.removeEventListener("storage", handler);
    };
  }, []);

  return {
    prefs,
    ready,
    update: (patch: Partial<Prefs>) => setPrefs(savePrefs(patch)),
  };
}

export const QUALITY_LABELS: Record<Quality, { title: string; hint: string }> = {
  low: { title: "منخفض", hint: "أداء أقصى للهواتف المتوسطة — ظلال وحركة مبسطة" },
  medium: { title: "متوسط", hint: "توازن بين الواقعية والأداء (موصى به)" },
  high: { title: "عالي", hint: "ظلال حقيقية، تفاصيل كاملة، حركة مرور كثيفة" },
};
