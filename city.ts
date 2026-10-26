import { eq } from "drizzle-orm";
import { db } from "@/db";
import { houses, lands, listings, users, type User } from "@/db/schema";
import { expireRentals } from "./seed";
import { getFeeSettings } from "./ledger";
import { num } from "./game";
import { publicUser, selfUser } from "./serialize";

export type LandDTO = Awaited<ReturnType<typeof cityPayload>>["lands"][number];

export async function cityPayload(viewer: User) {
  await expireRentals();
  const [landRows, houseRows, listingRows, userRows, feeSettings] = await Promise.all([
    db.select().from(lands).orderBy(lands.position),
    db.select().from(houses),
    db.select().from(listings).where(eq(listings.status, "active")),
    db.select().from(users),
    getFeeSettings(),
  ]);

  const usersById = new Map(userRows.map((u) => [u.id, u]));
  const housesByLand = new Map(houseRows.map((h) => [h.landId, h]));
  const listingsByLand = new Map<number, typeof listingRows>();
  for (const listing of listingRows) {
    const list = listingsByLand.get(listing.landId) ?? [];
    list.push(listing);
    listingsByLand.set(listing.landId, list);
  }

  const landsDto = landRows.map((land) => {
    const house = housesByLand.get(land.id) ?? null;
    const related = listingsByLand.get(land.id) ?? [];
    const landListing = related.find((l) => l.kind === "land") ?? null;
    const houseListing = house ? related.find((l) => l.kind === "house" && l.houseId === house.id) ?? null : null;
    return {
      id: land.id,
      code: land.code,
      position: land.position,
      x: land.x,
      y: land.y,
      zone: land.zone,
      price: num(land.price),
      status: land.status,
      ownerId: land.ownerId,
      owner: publicUser(land.ownerId ? usersById.get(land.ownerId) : null),
      house: house
        ? {
            id: house.id,
            name: house.name,
            style: house.style,
            status: house.status,
            buildCost: num(house.buildCost),
            owner: publicUser(usersById.get(house.ownerId)),
          }
        : null,
      landListing: landListing
        ? { id: landListing.id, price: num(landListing.price), mode: landListing.mode }
        : null,
      houseListing: houseListing
        ? {
            id: houseListing.id,
            price: num(houseListing.price),
            mode: houseListing.mode,
            rentDays: houseListing.rentDays,
          }
        : null,
      isMine: land.ownerId === viewer.id,
    };
  });

  return {
    user: selfUser(viewer),
    feeSettings,
    lands: landsDto,
    stats: {
      total: landRows.length,
      owned: landRows.filter((l) => l.ownerId).length,
      available: landRows.filter((l) => !l.ownerId).length,
      houses: houseRows.length,
      listed: listingRows.length,
    },
  };
}
