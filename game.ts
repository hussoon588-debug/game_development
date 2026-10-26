export const GAME_NAME = "المدينة العقارية الافتراضية";
export const CITY_NAME = "مدينة الياسمين";
export const DEVELOPER = "Hussein Alasswdi";
export const ADMIN_DISPLAY = "Hussein";
export const CURRENCY = "ريال يمني";
export const INTERNAL_RATE = "1000 عملة داخلية = 1000 ريال يمني";
export const LAND_COUNT = 50;

export const CITY_ZONES = [
  "الواجهة البحرية",
  "حي النخيل",
  "الحي الملكي",
  "حي اللؤلؤ",
  "الحي التجاري",
];

export type HouseStyle = {
  key: string;
  name: string;
  image: string;
  tone: string;
  accent: string;
};

export const HOUSE_STYLES: HouseStyle[] = [
  {
    key: "villa-1",
    name: "فيلا اللؤلؤة",
    image: "/images/house-1.jpg",
    tone: "from-sky-500/30 to-blue-900/40",
    accent: "#5cc8ff",
  },
  {
    key: "villa-2",
    name: "قصر الصحراء",
    image: "/images/house-2.jpg",
    tone: "from-amber-400/30 to-amber-900/40",
    accent: "#f4c66a",
  },
  {
    key: "villa-3",
    name: "بيت النخيل",
    image: "/images/house-3.jpg",
    tone: "from-emerald-400/30 to-emerald-900/40",
    accent: "#6ee7b7",
  },
  {
    key: "villa-4",
    name: "شقة الساحل",
    image: "/images/house-4.jpg",
    tone: "from-violet-400/30 to-indigo-900/40",
    accent: "#c4b5fd",
  },
];

export function styleOf(key: string | null | undefined): HouseStyle {
  return HOUSE_STYLES.find((style) => style.key === key) ?? HOUSE_STYLES[0];
}

export function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function fmt(value: string | number | null | undefined): string {
  const n = num(value);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

export function fmtMoney(value: string | number | null | undefined): string {
  return `${fmt(value)} ر.ي`;
}

export function calcFee(amount: number, ratePct: number): number {
  return round2((amount * ratePct) / 100);
}

export function levelForPoints(points: number): number {
  if (points <= 0) return 1;
  return Math.min(99, Math.floor(Math.sqrt(points)) + 1);
}

export function levelProgress(points: number) {
  const level = levelForPoints(points);
  const currentFloor = (level - 1) ** 2;
  const nextAt = level ** 2;
  const span = nextAt - currentFloor;
  const progress = span > 0 ? Math.min(100, Math.round(((points - currentFloor) / span) * 100)) : 0;
  return { level, points, nextAt, remaining: Math.max(0, nextAt - points), progress };
}

export function makeRef(prefix: string): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 7).toUpperCase();
  return `${prefix}-${stamp}-${rand}`;
}

export function makeWithdrawCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `WD${out}`;
}

export function directThreadKey(a: number, b: number): string {
  const [low, high] = a < b ? [a, b] : [b, a];
  return `direct:${low}:${high}`;
}

export function supportThreadKey(userId: number): string {
  return `support:${userId}`;
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "؟";
  if (parts.length === 1) return parts[0].slice(0, 2);
  return `${parts[0][0]}${parts[1][0]}`;
}

export function avatarGradient(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 360;
  return `linear-gradient(140deg, hsl(${hash} 70% 45%), hsl(${(hash + 55) % 360} 75% 28%))`;
}

export const TX_LABELS: Record<string, string> = {
  deposit: "إيداع",
  withdrawal: "سحب",
  transfer_out: "تحويل صادر",
  transfer_in: "تحويل وارد",
  land_purchase: "شراء أرض",
  land_sale: "بيع أرض",
  house_purchase: "شراء بيت",
  house_sale: "بيع بيت",
  rent_payment: "إيجار بيت",
  rent_income: "دخل إيجار",
  build: "بناء بيت",
  admin_credit: "شحن إداري",
  admin_debit: "خصم إداري",
};

export const CITY_MODE_LABELS: Record<string, string> = {
  visitor: "زائر",
  buyer: "مستخدم عادي",
  builder: "بشراء بيت",
};

export function statusLabel(status: string): { label: string; tone: string } {
  const map: Record<string, { label: string; tone: string }> = {
    available: { label: "متاحة", tone: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
    owned: { label: "مملوكة", tone: "bg-sky-400/15 text-sky-300 border-sky-400/30" },
    built: { label: "تحتوي بيتاً", tone: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
    listed: { label: "معروضة للبيع", tone: "bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30" },
    listed_for_sale: { label: "معروض للبيع", tone: "bg-fuchsia-400/15 text-fuchsia-300 border-fuchsia-400/30" },
    listed_for_rent: { label: "معروض للإيجار", tone: "bg-cyan-400/15 text-cyan-300 border-cyan-400/30" },
    rented: { label: "مؤجر", tone: "bg-indigo-400/15 text-indigo-300 border-indigo-400/30" },
    active: { label: "نشط", tone: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
    pending: { label: "قيد المراجعة", tone: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
    review: { label: "جاري المراجعة", tone: "bg-amber-400/15 text-amber-300 border-amber-400/30" },
    verified: { label: "تم التحقق", tone: "bg-sky-400/15 text-sky-300 border-sky-400/30" },
    paid: { label: "مكتمل", tone: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
    completed: { label: "مكتمل", tone: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
    approved: { label: "مكتمل", tone: "bg-emerald-400/15 text-emerald-300 border-emerald-400/30" },
    rejected: { label: "مرفوض", tone: "bg-rose-400/15 text-rose-300 border-rose-400/30" },
    cancelled: { label: "ملغي", tone: "bg-slate-400/15 text-slate-300 border-slate-400/30" },
    sold: { label: "مباع", tone: "bg-slate-400/15 text-slate-300 border-slate-400/30" },
    expired: { label: "منتهي", tone: "bg-slate-400/15 text-slate-300 border-slate-400/30" },
    unavailable: { label: "غير متاح", tone: "bg-slate-400/15 text-slate-300 border-slate-400/30" },
  };
  return map[status] ?? { label: status, tone: "bg-white/10 text-white/70 border-white/20" };
}
