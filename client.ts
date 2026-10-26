"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export async function api<T = Record<string, unknown>>(
  path: string,
  init?: RequestInit & { json?: unknown },
): Promise<T> {
  const { json, headers, ...rest } = init ?? {};
  const response = await fetch(path, {
    ...rest,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const data = (await response.json().catch(() => ({}))) as T & { ok?: boolean; error?: string };
  if (!response.ok || data?.ok === false) {
    throw new Error(data?.error || "تعذر الاتصال بالسيرفر، حاول مرة أخرى");
  }
  return data as T;
}

export function useApi<T>(url: string | null, intervalMs = 0) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(url));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!url) return;
      if (!silent) setLoading(true);
      try {
        const result = await api<T>(url);
        setData(result);
        setError(null);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "حدث خطأ غير متوقع");
      } finally {
        setLoading(false);
      }
    },
    [url],
  );

  useEffect(() => {
    let active = true;
    if (!url) {
      setLoading(false);
      return () => {
        active = false;
      };
    }
    setLoading(true);
    api<T>(url)
      .then((result) => {
        if (active) {
          setData(result);
          setError(null);
        }
      })
      .catch((cause: unknown) => {
        if (active) setError(cause instanceof Error ? cause.message : "حدث خطأ");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [url]);

  useEffect(() => {
    if (!url || !intervalMs) return;
    const id = setInterval(() => {
      void load(true);
    }, intervalMs);
    return () => clearInterval(id);
  }, [url, intervalMs, load]);

  return { data, loading, error, refresh: load, setData };
}

export function newKey(prefix: string): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 18)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${random}`.toUpperCase();
}

export function money(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return `${(Number.isFinite(n) ? n : 0).toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.ي`;
}

export function plainNumber(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return (Number.isFinite(n) ? n : 0).toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function when(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ar-YE-u-nu-latn", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function day(value: string | Date | null | undefined): string {
  if (!value) return "-";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ar-YE-u-nu-latn", { dateStyle: "medium" }).format(date);
}

export function remaining(endAt: string | Date): string {
  const end = typeof endAt === "string" ? new Date(endAt) : endAt;
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return "منتهي";
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (days > 0) return `${days} يوم و${hours} ساعة`;
  if (hours > 0) return `${hours} ساعة و${minutes} دقيقة`;
  return `${minutes} دقيقة`;
}

export type FeeSettings = {
  landPrice: number;
  buildCost: number;
  welcomeBonus: number;
  feeSale: number;
  feePurchase: number;
  feeRent: number;
  feeTransfer: number;
};

export type SelfUser = {
  publicId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  balance: number;
  reserved: number;
  totalDeposits: number;
  totalWithdrawals: number;
  level: number;
  activityPoints: number;
  progress: { level: number; points: number; nextAt: number; remaining: number; progress: number };
  isAdmin: boolean;
  cityMode: string | null;
  notificationsEnabled: boolean;
  language: string;
  createdAt: string;
};
