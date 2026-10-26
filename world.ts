import type { Quality } from "./quality";

export type Phase = "dawn" | "morning" | "noon" | "afternoon" | "sunset" | "dusk" | "night";

export type WorldMoment = {
  hour: number;
  phase: Phase;
  label: string;
  night: number;
  stars: number;
  sky: { top: string; mid: string; bottom: string; haze: string };
  sun: { x: number; y: number; kind: "sun" | "moon"; color: string; glow: string; visible: boolean; altitude: number };
  ambient: { color: string; opacity: number };
  sand: { base: string; light: string; dark: string };
  sea: { top: string; deep: string; foam: string; glint: number };
  shadow: { x: number; y: number; blur: number; opacity: number };
  windows: number;
  lamps: number;
  dust: number;
};

type Palette = Omit<WorldMoment, "hour" | "phase" | "sun" | "label" | "shadow">;

const PALETTES: Record<Phase, Palette> = {
  dawn: {
    night: 0.35,
    stars: 0.25,
    sky: { top: "#1d2a52", mid: "#7a4d6c", bottom: "#f3a878", haze: "rgba(255,176,120,0.35)" },
    ambient: { color: "#ff9d6e", opacity: 0.16 },
    sand: { base: "#c6a276", light: "#e2c69b", dark: "#8d7047" },
    sea: { top: "#164a63", deep: "#082c3f", foam: "rgba(255,240,225,0.7)", glint: 0.7 },
    windows: 0.45,
    lamps: 0.5,
    dust: 0.5,
  },
  morning: {
    night: 0,
    stars: 0,
    sky: { top: "#2a5f9f", mid: "#79b6e6", bottom: "#dceeff", haze: "rgba(255,255,255,0.22)" },
    ambient: { color: "#fff6dc", opacity: 0.06 },
    sand: { base: "#d3b184", light: "#efd7ac", dark: "#a3814f" },
    sea: { top: "#0f6b8c", deep: "#084258", foam: "rgba(255,255,255,0.85)", glint: 0.55 },
    windows: 0.15,
    lamps: 0.1,
    dust: 0.28,
  },
  noon: {
    night: 0,
    stars: 0,
    sky: { top: "#1f6fb6", mid: "#8fcdf5", bottom: "#eef8ff", haze: "rgba(255,255,255,0.3)" },
    ambient: { color: "#ffffff", opacity: 0.05 },
    sand: { base: "#dcbc8e", light: "#f6e3bb", dark: "#b08c58" },
    sea: { top: "#0f83a4", deep: "#075066", foam: "rgba(255,255,255,0.9)", glint: 0.75 },
    windows: 0.05,
    lamps: 0,
    dust: 0.2,
  },
  afternoon: {
    night: 0,
    stars: 0,
    sky: { top: "#2f6aa8", mid: "#9fc6e8", bottom: "#ffe9c6", haze: "rgba(255,224,178,0.3)" },
    ambient: { color: "#ffdfae", opacity: 0.12 },
    sand: { base: "#d8b185", light: "#f3d9ad", dark: "#a8814f" },
    sea: { top: "#0f6f8d", deep: "#084257", foam: "rgba(255,255,255,0.8)", glint: 0.85 },
    windows: 0.25,
    lamps: 0.2,
    dust: 0.35,
  },
  sunset: {
    night: 0.15,
    stars: 0.05,
    sky: { top: "#3a2a63", mid: "#d2694a", bottom: "#ffc27c", haze: "rgba(255,150,90,0.4)" },
    ambient: { color: "#ff9455", opacity: 0.22 },
    sand: { base: "#c99a6d", light: "#f0bd8b", dark: "#93603b" },
    sea: { top: "#2b4f6d", deep: "#11293f", foam: "rgba(255,236,214,0.75)", glint: 1 },
    windows: 0.6,
    lamps: 0.6,
    dust: 0.55,
  },
  dusk: {
    night: 0.6,
    stars: 0.4,
    sky: { top: "#111c3d", mid: "#3b3a6b", bottom: "#8a5a6a", haze: "rgba(120,90,150,0.3)" },
    ambient: { color: "#5a4a8a", opacity: 0.26 },
    sand: { base: "#8f7a5c", light: "#b49a74", dark: "#5f4f36" },
    sea: { top: "#1c3b52", deep: "#081c2b", foam: "rgba(220,232,245,0.6)", glint: 0.45 },
    windows: 0.85,
    lamps: 0.9,
    dust: 0.3,
  },
  night: {
    night: 1,
    stars: 1,
    sky: { top: "#040a18", mid: "#071228", bottom: "#0c1d38", haze: "rgba(30,60,110,0.25)" },
    ambient: { color: "#0a1a3a", opacity: 0.34 },
    sand: { base: "#6f6148", light: "#8e7c5e", dark: "#453a29" },
    sea: { top: "#0d2a3c", deep: "#04121d", foam: "rgba(200,220,240,0.45)", glint: 0.3 },
    windows: 1,
    lamps: 1,
    dust: 0.18,
  },
};

export function phaseForHour(hour: number): Phase {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "noon";
  if (hour >= 15 && hour < 17.5) return "afternoon";
  if (hour >= 17.5 && hour < 19) return "sunset";
  if (hour >= 19 && hour < 20.5) return "dusk";
  return "night";
}

export const PHASE_LABELS: Record<Phase, string> = {
  dawn: "الفجر",
  morning: "الصباح",
  noon: "الظهيرة",
  afternoon: "بعد الظهيرة",
  sunset: "الغروب",
  dusk: "الغسق",
  night: "الليل",
};

export function momentFor(date: Date = new Date(), offsetHours = 0): WorldMoment {
  const hour = (date.getHours() + date.getMinutes() / 60 + offsetHours + 24) % 24;
  const phase = phaseForHour(hour);
  const palette = PALETTES[phase];

  const dayStart = 5.4;
  const dayEnd = 18.6;
  const isDay = hour >= dayStart && hour <= dayEnd;
  let sunX: number;
  let sunY: number;
  let altitude: number;

  if (isDay) {
    const t = (hour - dayStart) / (dayEnd - dayStart);
    altitude = Math.sin(Math.PI * t);
    sunX = 5 + 90 * t;
    sunY = 88 - 74 * altitude;
  } else {
    const nightHour = hour > dayEnd ? hour - dayEnd : hour + 24 - dayEnd;
    const t = (nightHour % 15) / 15;
    altitude = 0.45 * Math.sin(Math.PI * t);
    sunX = 8 + 84 * t;
    sunY = 84 - 60 * altitude;
  }

  const shadeDir = sunX < 50 ? 1 : -1;
  const long = 1.6 - altitude * 0.9;
  const shadow = {
    x: Math.round(shadeDir * (5 + 9 * long)),
    y: Math.round(4 + 7 * long),
    blur: Math.round(3 + 5 * long),
    opacity: Math.min(0.6, 0.2 + long * 0.26),
  };

  return {
    hour,
    phase,
    label: PHASE_LABELS[phase],
    ...palette,
    shadow,
    sun: {
      x: sunX,
      y: sunY,
      kind: isDay ? "sun" : "moon",
      altitude,
      visible: true,
      color: isDay ? (altitude < 0.35 ? "#ffb066" : "#fff6d8") : "#dbe7ff",
      glow: isDay ? "rgba(255,214,140,0.55)" : "rgba(190,214,255,0.35)",
    },
  };
}

export function clockLabel(date: Date = new Date(), offsetHours = 0): string {
  const total = (date.getHours() + date.getMinutes() / 60 + offsetHours + 24) % 24;
  const h = Math.floor(total);
  const m = Math.floor((total - h) * 60);
  const suffix = h < 12 ? "صباحاً" : h < 17 ? "ظهراً" : "مساءً";
  const displayHour = h % 12 === 0 ? 12 : h % 12;
  return `${displayHour}:${String(m).padStart(2, "0")} ${suffix}`;
}

/* ============ مخطط المدينة الواقعي ============ */
export const WORLD = {
  width: 1700,
  height: 1430,
  skyHeight: 132,
  groundTop: 132,
  plotW: 116,
  plotH: 116,
  plotStartX: 220,
  plotStartY: 176,
  colGap: 146,
  rowGap: 190,
  plotCols: 10,
  plotRows: 5,
  roadH: 74,
  cornicheTop: 1050,
  shoreTop: 1160,
  seaBottom: 1430,
  westAvenue: { x: 182, width: 34 },
  eastAvenue: { x: 1656, width: 34 },
  landmarkWidth: 176,
};

export function plotPoint(position: number) {
  const col = position % WORLD.plotCols;
  const row = Math.floor(position / WORLD.plotCols);
  return {
    x: WORLD.plotStartX + col * WORLD.colGap,
    y: WORLD.plotStartY + row * WORLD.rowGap,
    col,
    row,
  };
}

export const H_ROADS = Array.from({ length: WORLD.plotRows }).map((_, row) => ({
  y: WORLD.plotStartY + row * WORLD.rowGap + WORLD.plotH,
  height: row === WORLD.plotRows - 1 ? 54 : WORLD.roadH,
}));

export const V_LANES = Array.from({ length: WORLD.plotCols - 1 }).map((_, index) => ({
  x: WORLD.plotStartX + index * WORLD.colGap + WORLD.plotW,
  width: WORLD.colGap - WORLD.plotW,
}));

export type LandmarkKind = "tower" | "market" | "mosque" | "garden" | "hotel";

export const LANDMARKS: { kind: LandmarkKind; label: string; x: number; y: number; w: number; h: number }[] = [
  { kind: "tower", label: "برج المدينة", x: 14, y: 186, w: 152, h: 208 },
  { kind: "market", label: "السوق المركزي", x: 12, y: 414, w: 156, h: 164 },
  { kind: "mosque", label: "جامع الياسمين", x: 26, y: 600, w: 136, h: 176 },
  { kind: "garden", label: "الحدائق العامة", x: 12, y: 800, w: 156, h: 150 },
  { kind: "hotel", label: "فندق الكورنيش", x: 24, y: 972, w: 140, h: 160 },
];

export type Detail = {
  cars: number;
  stars: number;
  dust: number;
  lamps: number;
  birds: number;
  decorations: number;
  shadows: boolean;
  seaAnimation: boolean;
};

export function detailFor(quality: Quality): Detail {
  if (quality === "low") {
    return { cars: 6, stars: 26, dust: 0, lamps: 8, birds: 2, decorations: 0, shadows: false, seaAnimation: true };
  }
  if (quality === "high") {
    return { cars: 22, stars: 90, dust: 18, lamps: 30, birds: 6, decorations: 3, shadows: true, seaAnimation: true };
  }
  return { cars: 13, stars: 56, dust: 9, lamps: 18, birds: 4, decorations: 2, shadows: true, seaAnimation: true };
}

/** PRNG ثابت لضمان تطابق العرض بين السيرفر والمتصفح */
export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type CarSpec = {
  id: string;
  axis: "x" | "y";
  lane: number;
  offset: number;
  duration: number;
  delay: number;
  reverse: boolean;
  color: string;
  scale: number;
  kind: "car" | "van" | "bus";
};

const CAR_COLORS = ["#d9e3ef", "#22344d", "#b23a48", "#2b7a78", "#d7a13b", "#59606d", "#e6e6e6", "#7b3f61"];

export function trafficFor(quality: Quality): CarSpec[] {
  const detail = detailFor(quality);
  const random = seeded(20260214);
  const cars: CarSpec[] = [];
  const lanesX = H_ROADS.flatMap((road, index) => [
    { y: road.y + 16, lane: index },
    { y: road.y + 42, lane: index },
  ]);
  const lanesY = [
    { x: WORLD.westAvenue.x + 6, lane: 0 },
    { x: V_LANES[2].x + 12, lane: 2 },
    { x: V_LANES[5].x + 12, lane: 5 },
    { x: WORLD.eastAvenue.x + 6, lane: 9 },
  ];
  for (let i = 0; i < detail.cars; i += 1) {
    if (i % 3 === 0) {
      const lane = lanesY[Math.floor(random() * lanesY.length)];
      cars.push({
        id: `car-y-${i}`,
        axis: "y",
        lane: lane.x,
        offset: random() * 400,
        duration: 26 + random() * 22,
        delay: -random() * 40,
        reverse: random() > 0.5,
        color: CAR_COLORS[Math.floor(random() * CAR_COLORS.length)],
        scale: 0.9 + random() * 0.3,
        kind: random() > 0.86 ? "van" : "car",
      });
    } else {
      const lane = lanesX[Math.floor(random() * lanesX.length)];
      cars.push({
        id: `car-x-${i}`,
        axis: "x",
        lane: lane.y,
        offset: random() * 500,
        duration: 22 + random() * 26,
        delay: -random() * 45,
        reverse: random() > 0.5,
        color: CAR_COLORS[Math.floor(random() * CAR_COLORS.length)],
        scale: 0.85 + random() * 0.35,
        kind: random() > 0.93 ? "bus" : random() > 0.8 ? "van" : "car",
      });
    }
  }
  return cars;
}

export function starsFor(quality: Quality) {
  const random = seeded(777001);
  return Array.from({ length: detailFor(quality).stars }).map((_, index) => ({
    id: index,
    x: random() * 100,
    y: random() * 78,
    size: 0.8 + random() * 1.9,
    delay: random() * 4,
    opacity: 0.35 + random() * 0.65,
  }));
}

export function dustFor(quality: Quality) {
  const random = seeded(424242);
  return Array.from({ length: detailFor(quality).dust }).map((_, index) => ({
    id: index,
    x: random() * 100,
    y: 30 + random() * 65,
    size: 1.6 + random() * 3.4,
    duration: 26 + random() * 20,
    delay: -random() * 30,
  }));
}

export function gullsFor(quality: Quality) {
  const random = seeded(918273);
  return Array.from({ length: detailFor(quality).birds }).map((_, index) => ({
    id: index,
    top: 12 + random() * 70,
    duration: 26 + random() * 24,
    delay: -random() * 30,
    scale: 0.7 + random() * 0.7,
  }));
}

export function cloudsFor(quality: Quality) {
  const random = seeded(515253);
  const count = quality === "low" ? 3 : quality === "high" ? 8 : 5;
  return Array.from({ length: count }).map((_, index) => ({
    id: index,
    x: random() * 100,
    y: 10 + random() * 50,
    scale: 0.6 + random() * 1.1,
    opacity: 0.18 + random() * 0.35,
    duration: 90 + random() * 90,
    delay: -random() * 60,
  }));
}
