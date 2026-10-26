import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";
import { ApiError } from "./http";

export const SESSION_COOKIE = "city_session";

export async function getSessionUser(): Promise<User | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.token, token))
    .limit(1);
  const sessionRow = rows[0];
  const user = sessionRow?.user ?? null;
  if (!user || !user.isActive) return null;
  // Enforce the same maximum lifetime on the server, even if a copied cookie is replayed.
  const [session] = await db.select({ createdAt: sessions.createdAt }).from(sessions).where(eq(sessions.token, token)).limit(1);
  if (!session || session.createdAt.getTime() < Date.now() - 1000 * 60 * 60 * 24 * 30) {
    await db.delete(sessions).where(eq(sessions.token, token));
    const store = await cookies();
    store.delete(SESSION_COOKIE);
    return null;
  }
  return user;
}

export async function createSession(userId: number): Promise<string> {
  const token = randomBytes(24).toString("hex");
  await db.insert(sessions).values({ token, userId });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  return token;
}

export async function destroySession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.token, token));
  }
  store.delete(SESSION_COOKIE);
}

export async function requireUser(): Promise<User> {
  const user = await getSessionUser();
  if (!user) throw new ApiError("يجب تسجيل الدخول أولاً", 401);
  return user;
}

export async function requireAdmin(): Promise<User> {
  const user = await requireUser();
  if (!user.isAdmin) throw new ApiError("هذه الصلاحية للأدمن Hussein فقط", 403);
  return user;
}

export function adminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 16) {
    throw new ApiError("تسجيل دخول الإدارة غير مهيأ بأمان. اضبط ADMIN_PASSWORD بطول 16 حرفاً على الأقل.", 503);
  }
  return password;
}
