import { desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import { houses, lands, listings, rentals, users, type User } from "@/db/schema";
import { expireRentals } from "./seed";
import { getFeeSettings } from "./ledger";
import { calcFee, num, round2 } from "./game";
import { publicUser, selfUser } from "./serialize";

export async function marketPayload(viewer: User) {
  await expireRentals();
  const [feeSettings, listingRows, landRows, houseRows, userRows, contractRows] = await Promise.all([
    getFeeSettings(),
    db.select().from(listings).orderBy(desc(listings.createdAt)).limit(200),
    db.select().from(lands),
    db.select().from(houses),
    db.select().from(users),
    db.select().from(rentals).orderBy(desc(rentals.createdAt)).limit(50),
  ]);

  const usersById = new Map(userRows.map((u) => [u.id, u]));
  const landsById = new Map(landRows.map((l) => [l.id, l]));
  const housesById = new Map(houseRows.map((h) => [h.id, h]));

  const listingDtos = listingRows.map((listing) => {
    const land = landsById.get(listing.landId);
    const house = listing.houseId ? housesById.get(listing.houseId) : null;
    const seller = usersById.get(listing.sellerId);
    const fee = calcFee(num(listing.price), listing.mode === "rent" ? feeSettings.feeRent : feeSettings.feePurchase);
    return {
      id: listing.id,
      kind: listing.kind,
      mode: listing.mode,
      price: num(listing.price),
      originalPrice: num(listing.originalPrice),
      rentDays: listing.rentDays,
      status: listing.status,
      createdAt: listing.createdAt,
      seller: publicUser(seller),
      isMine: listing.sellerId === viewer.id,
      land: land
        ? { id: land.id, code: land.code, zone: land.zone, position: land.position, price: num(land.price) }
        : null,
      house: house
        ? { id: house.id, name: house.name, style: house.style, status: house.status, buildCost: num(house.buildCost) }
        : null,
      fee,
      total: round2(num(listing.price) + fee),
      maxPrice: round2(num(listing.originalPrice) * 2),
    };
  });

  const myLands = landRows
    .filter((land) => land.ownerId === viewer.id)
    .map((land) => {
      const house = houseRows.find((h) => h.landId === land.id) ?? null;
      const listing = listingRows.find(
        (l) => l.status === "active" && l.landId === land.id,
      );
      return {
        id: land.id,
        code: land.code,
        zone: land.zone,
        price: num(land.price),
        status: land.status,
        house: house
          ? {
              id: house.id,
              name: house.name,
              style: house.style,
              status: house.status,
              buildCost: num(house.buildCost),
            }
          : null,
        listing: listing ? { id: listing.id, mode: listing.mode, price: num(listing.price) } : null,
        maxPrice: house ? round2(num(house.buildCost) * 2) : round2(num(land.price) * 2),
      };
    });

  const myHouseLandIds = new Set(
    houseRows.filter((h) => h.ownerId === viewer.id).map((h) => h.landId),
  );
  const myHouseDtos = houseRows
    .filter((h) => h.ownerId === viewer.id)
    .map((house) => {
      const land = landsById.get(house.landId);
      const listing = listingRows.find((l) => l.status === "active" && l.houseId === house.id);
      return {
        id: house.id,
        name: house.name,
        style: house.style,
        status: house.status,
        landCode: land?.code ?? "-",
        landId: house.landId,
        buildCost: num(house.buildCost),
        landOwnedByMe: myHouseLandIds.has(house.landId) && land?.ownerId === viewer.id,
        listing: listing ? { id: listing.id, mode: listing.mode, price: num(listing.price) } : null,
        maxPrice: round2(num(house.buildCost) * 2),
      };
    });

  return {
    user: selfUser(viewer),
    feeSettings,
    listings: listingDtos.filter((l) => l.status === "active"),
    recentClosed: listingDtos.filter((l) => l.status !== "active").slice(0, 10),
    myLands,
    myHouses: myHouseDtos,
    myListings: listingDtos.filter((l) => l.isMine),
    contracts: contractRows
      .filter((c) => c.tenantId === viewer.id || c.landlordId === viewer.id)
      .map((contract) => {
        const house = housesById.get(contract.houseId);
        const land = house ? landsById.get(house.landId) : null;
        return {
          id: contract.id,
          price: num(contract.price),
          days: contract.days,
          startAt: contract.startAt,
          endAt: contract.endAt,
          status: contract.status,
          role: contract.tenantId === viewer.id ? "tenant" : "landlord",
          houseName: house?.name ?? "بيت",
          style: house?.style ?? "villa-1",
          landCode: land?.code ?? "-",
          other: publicUser(usersById.get(contract.tenantId === viewer.id ? contract.landlordId : contract.tenantId)),
        };
      }),
  };
}

export async function activeContractForHouse(houseId: number) {
  const rows = await db
    .select()
    .from(rentals)
    .where(or(eq(rentals.houseId, houseId), eq(rentals.houseId, houseId)));
  return rows;
}

export async function listingsForLands(landIds: number[]) {
  if (landIds.length === 0) return [];
  return db
    .select()
    .from(listings)
    .where(inArray(listings.landId, landIds))
    .orderBy(desc(listings.createdAt));
}
