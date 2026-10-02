import type { BBox } from "./overpass.ts";

export type RestKind = "spring" | "water" | "shelter" | "picnic" | "cave" | "shade";

export interface RestSpot {
  /** OSM node id, or null for spots derived from our own shade analysis. */
  osm_id: number | null;
  kind: RestKind;
  name: string | null;
  lon: number;
  lat: number;
  source: "osm" | "derived";
  /** True when water is available (cooling). */
  has_water: boolean;
  /** Derived shade spots only: mean afternoon sun exposure percent. */
  exposure_pct: number | null;
}

export function buildRestQuery(bbox: BBox): string {
  const b = bbox.join(",");
  return `[out:json][timeout:180];
(
  node["natural"="spring"](${b});
  node["amenity"~"^(drinking_water|shelter)$"](${b});
  node["man_made"~"^(water_well|water_tap)$"](${b});
  node["tourism"="picnic_site"](${b});
  node["leisure"="picnic_table"](${b});
  node["natural"="cave_entrance"](${b});
);
out tags;`;
}

interface Node {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

export function parseRestNodes(json: { elements: Node[] }): RestSpot[] {
  const out: RestSpot[] = [];
  for (const el of json.elements) {
    if (el.type !== "node" || el.lat === undefined || el.lon === undefined) continue;
    const t = el.tags ?? {};
    let kind: RestKind | null = null;
    if (t.natural === "spring") kind = "spring";
    else if (t.amenity === "drinking_water" || t.man_made === "water_well" || t.man_made === "water_tap") kind = "water";
    else if (t.amenity === "shelter") kind = "shelter";
    else if (t.tourism === "picnic_site" || t.leisure === "picnic_table") kind = "picnic";
    else if (t.natural === "cave_entrance") kind = "cave";
    if (!kind) continue;
    out.push({
      osm_id: el.id,
      kind,
      name: t.name ?? null,
      lon: el.lon,
      lat: el.lat,
      source: "osm",
      has_water: kind === "spring" || kind === "water",
      exposure_pct: null,
    });
  }
  return out;
}
