import { haversine, type Point, type Point3 } from "./geo.ts";
import type { TerrainSampler } from "./dem.ts";
import { localToUtcMs, sunPosition, type SunPosition } from "./sun.ts";

/** Fraction (0..1) of sky blocked by tree canopy at a point. */
export interface CanopySampler {
  fraction(lon: number, lat: number): number;
}
export const NO_CANOPY: CanopySampler = { fraction: () => 0 };

export interface ReferenceDay {
  key: string;
  year: number;
  month: number;
  day: number;
  utcOffsetHours: number;
}

// Local clock hours 7..18. Summer solstice, equinox and winter solstice bracket the year.
export const REFERENCE_DAYS: ReferenceDay[] = [
  { key: "summer", year: 2026, month: 6, day: 21, utcOffsetHours: -7 },
  { key: "equinox", year: 2026, month: 3, day: 20, utcOffsetHours: -7 },
  { key: "winter", year: 2026, month: 12, day: 21, utcOffsetHours: -8 },
];
export const HOURS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

const M_PER_DEG_LAT = 111320;
const STEP_M = 30;
const MAX_RAY_M = 5000;
const EYE_M = 1.5; // standing hiker

/** True if terrain between the point and the sun blocks direct light. */
export function terrainShaded(dem: TerrainSampler, lon: number, lat: number, sun: SunPosition): boolean {
  if (sun.altitude <= 0) return true;
  const tanAlt = Math.tan((sun.altitude * Math.PI) / 180);
  const z0 = dem.elevationAt(lon, lat) + EYE_M;
  const az = (sun.azimuth * Math.PI) / 180;
  const dx = Math.sin(az);
  const dy = Math.cos(az);
  const cosLat = Math.cos((lat * Math.PI) / 180);
  const reach = Math.min(MAX_RAY_M, Math.max(0, dem.maxElevationM - z0) / tanAlt);
  for (let d = STEP_M; d <= reach; d += STEP_M) {
    const qLon = lon + (dx * d) / (M_PER_DEG_LAT * cosLat);
    const qLat = lat + (dy * d) / M_PER_DEG_LAT;
    if (dem.elevationAt(qLon, qLat) - z0 > tanAlt * d) return true;
  }
  return false;
}

/** Sun exposure 0..1 for one point and sun position (1 = full sun). */
export function exposure(dem: TerrainSampler, canopy: CanopySampler, lon: number, lat: number, sun: SunPosition): number {
  if (terrainShaded(dem, lon, lat, sun)) return 0;
  return 1 - Math.min(1, Math.max(0, canopy.fraction(lon, lat)));
}

export interface SunProfile {
  /** day key -> exposure percent (0..100) for each hour in HOURS, averaged along the trail. */
  [day: string]: number[];
}

export interface ShadeResult {
  profile: SunProfile;
  /** Mean summer exposure 11:00-15:00, the headline "how exposed is this trail" number. */
  midday_summer_pct: number;
  /** Per-point mean summer exposure 12:00-16:00 (0..1), used to find rest spots. */
  afternoon: number[];
}

export function computeShade(points: Point3[], dem: TerrainSampler, canopy: CanopySampler = NO_CANOPY): ShadeResult {
  const profile: SunProfile = {};
  let afternoon: number[] = new Array(points.length).fill(0);
  for (const day of REFERENCE_DAYS) {
    const perHour: number[] = [];
    for (const h of HOURS) {
      const t = localToUtcMs(day.year, day.month, day.day, h, day.utcOffsetHours);
      let sum = 0;
      const mid = points[Math.floor(points.length / 2)];
      const sun = sunPosition(t, mid[1], mid[0]); // sun moves negligibly across one trail
      const per = points.map((p) => exposure(dem, canopy, p[0], p[1], sun));
      for (const e of per) sum += e;
      perHour.push((sum / points.length) * 100);
      if (day.key === "summer" && h >= 12 && h <= 16) afternoon = afternoon.map((a, i) => a + per[i] / 5);
    }
    profile[day.key] = perHour.map((v) => Math.round(v * 10) / 10);
  }
  const idx = [11, 12, 13, 14, 15].map((h) => HOURS.indexOf(h));
  const midday = idx.reduce((s, i) => s + profile.summer[i], 0) / idx.length;
  return { profile, midday_summer_pct: Math.round(midday * 10) / 10, afternoon };
}

export interface ShadeSpot {
  lon: number;
  lat: number;
  length_m: number;
  /** Mean afternoon exposure along the stretch, percent. */
  exposure_pct: number;
}

/**
 * Contiguous stretches that stay shaded in the hot afternoon and are flat enough
 * to sit: candidate "natural" rest spots.
 */
export function deriveShadeSpots(
  points: Point3[],
  afternoon: number[],
  opts = { maxExposure: 0.3, minLengthM: 40, maxGradePct: 10 },
): ShadeSpot[] {
  const spots: ShadeSpot[] = [];
  let run: number[] = [];
  const flush = () => {
    if (run.length >= 2) {
      let len = 0;
      for (let k = 1; k < run.length; k++) {
        len += haversine([points[run[k - 1]][0], points[run[k - 1]][1]] as Point, [points[run[k]][0], points[run[k]][1]] as Point);
      }
      if (len >= opts.minLengthM) {
        const mid = points[run[Math.floor(run.length / 2)]];
        const mean = run.reduce((s, i) => s + afternoon[i], 0) / run.length;
        spots.push({ lon: mid[0], lat: mid[1], length_m: len, exposure_pct: Math.round(mean * 1000) / 10 });
      }
    }
    run = [];
  };
  for (let i = 0; i < points.length; i++) {
    let grade = 0;
    if (i > 0) {
      const d = haversine([points[i - 1][0], points[i - 1][1]] as Point, [points[i][0], points[i][1]] as Point);
      grade = d > 0 ? (Math.abs(points[i][2] - points[i - 1][2]) / d) * 100 : 0;
    }
    if (afternoon[i] <= opts.maxExposure && grade <= opts.maxGradePct) run.push(i);
    else flush();
  }
  flush();
  return spots;
}
