import type { User } from "@/db/schema";
import { levelProgress, num } from "./game";

export type PublicUser = {
  publicId: string;
  name: string;
  avatarUrl: string | null;
  level: number;
};

export function publicUser(user: User | null | undefined): PublicUser | null {
  if (!user) return null;
  return {
    publicId: user.publicId,
    name: user.name,
    avatarUrl: user.avatarUrl,
    level: user.level,
  };
}

export function selfUser(user: User) {
  return {
    publicId: user.publicId,
    name: user.name,
    email: user.email,
    avatarUrl: user.avatarUrl,
    coverUrl: user.coverUrl,
    balance: num(user.balance),
    reserved: num(user.reserved),
    totalDeposits: num(user.totalDeposits),
    totalWithdrawals: num(user.totalWithdrawals),
    level: user.level,
    activityPoints: user.activityPoints,
    progress: levelProgress(user.activityPoints),
    isAdmin: user.isAdmin,
    cityMode: user.cityMode,
    notificationsEnabled: user.notificationsEnabled,
    language: user.language,
    createdAt: user.createdAt,
  };
}

export type SelfUser = ReturnType<typeof selfUser>;
