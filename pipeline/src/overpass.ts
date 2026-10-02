import type { Point } from "./geo.ts";

export type BBox = [south: number, west: number, north: number, east: number];

export interface RawWay {
  osm_id: number;
  name: string | null;
  highway: string;
  sac_scale: string | null;
  surface: string | null;
  geometry: Point[];
}

/** Walkable paths that are not private/no-foot. `out geom` embeds coordinates. */
export function buildQuery(bbox: BBox): string {
  const b = bbox.join(",");
  return `[out:json][timeout:180];
(
  way["highway"~"^(path|footway|track|steps)$"]["foot"!~"^(no|private)$"]["access"!~"^(no|private)$"](${b});
);
out geom tags;`;
}

interface OverpassElement {
  type: string;
  id: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
}

export function parseElements(json: { elements: OverpassElement[] }): RawWay[] {
  const out: RawWay[] = [];
  for (const el of json.elements) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
    const t = el.tags ?? {};
    out.push({
      osm_id: el.id,
      name: t.name ?? null,
      highway: t.highway ?? "path",
      sac_scale: t.sac_scale ?? null,
      surface: t.surface ?? null,
      geometry: el.geometry.map((g) => [g.lon, g.lat]),
    });
  }
  return out;
}
