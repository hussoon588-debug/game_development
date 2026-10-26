import { and, eq, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  houses,
  lands,
  listings,
  notifications,
  rentals,
  settings,
  users,
} from "@/db/schema";
import { CITY_ZONES, LAND_COUNT, makeRef } from "./game";

let seedPromise: Promise<void> | null = null;

export function ensureSeeded(): Promise<void> {
  if (!seedPromise) {
    seedPromise = runSeed().catch((error) => {
      seedPromise = null;
      throw error;
    });
  }
  return seedPromise;
}

async function runSeed(): Promise<void> {
  // Never create demo accounts, balances, or property listings in production by default.
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO_SEED !== "true") {
    await db.insert(settings).values({ id: 1 }).onConflictDoNothing();
    return;
  }
  const existing = await db.select({ id: settings.id }).from(settings).limit(1);
  const [userCount] = await db.select({ value: sql<number>`count(*)::int` }).from(users);
  // لا تبدأ إلا إذا كانت القاعدة فارغة فعلاً أو لم يتم تهيئتها بالكامل
  if (existing.length > 0 && Number(userCount?.value ?? 0) > 0) return;

  await db.insert(settings).values({ id: 1 }).onConflictDoNothing();

  const demoUsers = [
    {
      publicId: "100001",
      name: "Hussein",
      email: "hussein@city.game",
      balance: "250000",
      isAdmin: true,
      level: 9,
      activityPoints: 64,
    },
    {
      publicId: "100002",
      name: "سالم اليماني",
      email: "salem@city.game",
      balance: "18400",
      level: 4,
      activityPoints: 14,
    },
    {
      publicId: "100003",
      name: "نورة الحربي",
      email: "noura@city.game",
      balance: "12750",
      level: 3,
      activityPoints: 9,
    },
    {
      publicId: "100004",
      name: "فهد الحداد",
      email: "fahd@city.game",
      balance: "8300",
      level: 2,
      activityPoints: 5,
    },
    {
      publicId: "100005",
      name: "ليان السقاف",
      email: "layan@city.game",
      balance: "15900",
      level: 3,
      activityPoints: 10,
    },
  ];

  await db.insert(users).values(demoUsers).onConflictDoNothing();

  const allUsers = await db.select().from(users);
  const byPublicId = new Map(allUsers.map((u) => [u.publicId, u]));
  const admin = byPublicId.get("100001");
  const demoIds = ["100002", "100003", "100004", "100005"].map(
    (id) => byPublicId.get(id)?.id ?? admin?.id,
  );

  const landValues = Array.from({ length: LAND_COUNT }).map((_, position) => {
    const col = position % 10;
    const row = Math.floor(position / 10);
    return {
      code: `LAND_${String(position + 1).padStart(3, "0")}`,
      position,
      x: 100 + col * 142,
      y: 106 + row * 186,
      zone: CITY_ZONES[row] ?? CITY_ZONES[0],
      price: "500",
    };
  });
  await db.insert(lands).values(landValues).onConflictDoNothing();

  const landRows = await db.select().from(lands);
  const byPosition = new Map(landRows.map((l) => [l.position, l]));

  const ownership: { pos: number; user: number; house?: string; name?: string }[] = [
    { pos: 2, user: 0, house: "villa-1", name: "فيلا اللؤلؤة" },
    { pos: 3, user: 1, house: "villa-2", name: "قصر الصحراء" },
    { pos: 7, user: 2 },
    { pos: 12, user: 3, house: "villa-3", name: "بيت النخيل" },
    { pos: 15, user: 0 },
    { pos: 21, user: 1, house: "villa-4", name: "شقة الساحل" },
    { pos: 27, user: 2, house: "villa-1", name: "فيلا اللؤلؤة" },
    { pos: 34, user: 3 },
    { pos: 41, user: 0, house: "villa-2", name: "قصر الصحراء" },
    { pos: 46, user: 1, house: "villa-3", name: "بيت النخيل" },
  ];

  const houseByPosition = new Map<number, number>();
  for (const record of ownership) {
    const land = byPosition.get(record.pos);
    if (!land) continue;
    const ownerId = demoIds[record.user];
    if (!ownerId) continue;
    await db
      .update(lands)
      .set({ ownerId, status: record.house ? "built" : "owned" })
      .where(eq(lands.id, land.id));
    if (record.house) {
      const inserted = await db
        .insert(houses)
        .values({
          landId: land.id,
          ownerId,
          style: record.house,
          name: record.name ?? "فيلا",
          buildCost: "1700",
          status: "owned",
        })
        .onConflictDoNothing()
        .returning({ id: houses.id });
      if (inserted[0]) houseByPosition.set(record.pos, inserted[0].id);
    }
  }

  // إعادة تحميل الأراضي بعد تحديث الملكية لتفادي البيانات القديمة
  const refreshedLands = await db.select().from(lands);
  for (const row of refreshedLands) byPosition.set(row.position, row);

  const landSale = { pos: 7, price: "850" };
  const landSale2 = { pos: 34, price: "720" };
  const houseSale = { pos: 27, price: "2600" };
  const houseRent = { pos: 21, price: "650", days: 7 };
  const houseRent2 = { pos: 46, price: "1500", days: 30 };

  for (const item of [landSale, landSale2]) {
    const land = byPosition.get(item.pos);
    if (!land?.ownerId) continue;
    await db.insert(listings).values({
      kind: "land",
      mode: "sale",
      landId: land.id,
      sellerId: land.ownerId,
      price: item.price,
      originalPrice: "500",
    });
    await db.update(lands).set({ status: "listed" }).where(eq(lands.id, land.id));
  }

  const saleHouseId = houseByPosition.get(houseSale.pos);
  const saleLand = byPosition.get(houseSale.pos);
  if (saleHouseId && saleLand?.ownerId) {
    await db.insert(listings).values({
      kind: "house",
      mode: "sale",
      landId: saleLand.id,
      houseId: saleHouseId,
      sellerId: saleLand.ownerId,
      price: houseSale.price,
      originalPrice: "1700",
    });
    await db.update(houses).set({ status: "listed_for_sale" }).where(eq(houses.id, saleHouseId));
  }

  for (const rent of [houseRent, houseRent2]) {
    const houseId = houseByPosition.get(rent.pos);
    const land = byPosition.get(rent.pos);
    if (!houseId || !land?.ownerId) continue;
    await db.insert(listings).values({
      kind: "house",
      mode: "rent",
      landId: land.id,
      houseId,
      sellerId: land.ownerId,
      price: rent.price,
      originalPrice: "1700",
      rentDays: rent.days,
    });
    await db.update(houses).set({ status: "listed_for_rent" }).where(eq(houses.id, houseId));
  }

  await db.insert(notifications).values({
    title: "أهلاً بك في المدينة العقارية الافتراضية",
    body: `تم إطلاق ${LAND_COUNT} قطعة أرض في ${CITY_ZONES.length} أحياء. سعر الأرض ${500} ريال يمني، وكل 1000 عملة داخلية = 1000 ريال يمني. ابدأ رحلتك الآن من زر دخول المدينة.`,
    createdBy: admin?.id ?? null,
  });

  if (admin) {
    await db.insert(notifications).values({
      title: "تنبيه من الإدارة",
      body: "عمولة التحويل والبيع والشراء والإيجار 10% تُعرض قبل التأكيد ولا يمكن تعديلها من التطبيق. الدعم متاح على مدار الساعة.",
      createdBy: admin.id,
    });
  }
}

/** إنهاء عقود الإيجار المنتهية وإعادة الحالة للسوق */
export async function expireRentals(): Promise<void> {
  const now = new Date();
  const expired = await db
    .select()
    .from(rentals)
    .where(and(eq(rentals.status, "active"), lt(rentals.endAt, now)));
  for (const contract of expired) {
    await db.update(rentals).set({ status: "expired" }).where(eq(rentals.id, contract.id));
    await db
      .update(houses)
      .set({ status: "listed_for_rent" })
      .where(and(eq(houses.id, contract.houseId), eq(houses.status, "rented")));
    await db
      .update(listings)
      .set({ status: "active", closedAt: null })
      .where(and(eq(listings.id, contract.listingId), eq(listings.status, "rented")));
  }
}

let countersPromise: Promise<void> | null = null;

/** يضمن وجود الأراضي الخمسين حتى لو تم حذف جزء منها */
export async function ensureLands(): Promise<void> {
  if (!countersPromise) {
    countersPromise = (async () => {
      const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(lands);
      if (Number(row?.count ?? 0) >= LAND_COUNT) return;
      const landValues = Array.from({ length: LAND_COUNT }).map((_, position) => {
        const col = position % 10;
        const rowIndex = Math.floor(position / 10);
        return {
          code: `LAND_${String(position + 1).padStart(3, "0")}`,
          position,
          x: 100 + col * 142,
          y: 106 + rowIndex * 186,
          zone: CITY_ZONES[rowIndex] ?? CITY_ZONES[0],
          price: "500",
        };
      });
      await db.insert(lands).values(landValues).onConflictDoNothing();
    })().catch((error) => {
      countersPromise = null;
      throw error;
    });
  }
  return countersPromise;
}

export function newRef(prefix: string): string {
  return makeRef(prefix);
}
