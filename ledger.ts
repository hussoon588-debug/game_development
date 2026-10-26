import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { settings, users } from "@/db/schema";
import { levelForPoints, num } from "./game";

export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type FeeSettings = {
  landPrice: number;
  buildCost: number;
  welcomeBonus: number;
  feeSale: number;
  feePurchase: number;
  feeRent: number;
  feeTransfer: number;
};

export const DEFAULT_SETTINGS: FeeSettings = {
  landPrice: 500,
  buildCost: 1200,
  welcomeBonus: 5000,
  feeSale: 10,
  feePurchase: 10,
  feeRent: 10,
  feeTransfer: 10,
};

export async function getFeeSettings(): Promise<FeeSettings> {
  const [row] = await db.select().from(settings).where(eq(settings.id, 1)).limit(1);
  if (!row) {
    await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
    return DEFAULT_SETTINGS;
  }
  return {
    landPrice: num(row.landPrice),
    buildCost: num(row.buildCost),
    welcomeBonus: num(row.welcomeBonus),
    feeSale: num(row.feeSale),
    feePurchase: num(row.feePurchase),
    feeRent: num(row.feeRent),
    feeTransfer: num(row.feeTransfer),
  };
}

export async function nextPublicId(): Promise<string> {
  const result = await db.execute(
    sql`select coalesce(max(public_id::int), 100000) + 1 as next from users`,
  );
  const rows = result.rows as { next: string | number }[];
  const value = Number(rows[0]?.next ?? 100002);
  return String(Number.isFinite(value) ? value : 100002);
}

export async function bumpActivity(tx: Tx, userId: number, points: number): Promise<void> {
  const [row] = await tx.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!row) return;
  const total = row.activityPoints + points;
  await tx
    .update(users)
    .set({ activityPoints: total, level: levelForPoints(total) })
    .where(eq(users.id, userId));
}

export async function lockUser(tx: Tx, userId: number) {
  const [row] = await tx.select().from(users).where(eq(users.id, userId)).for("update").limit(1);
  return row ?? null;
}

export function addMoney(a: string | number, b: string | number): number {
  return num(a) + num(b);
}
