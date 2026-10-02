// Usage: node src/ingest.ts <region> [path/to/overpass.json] [--no-shade]
// Fetches (or reads) OSM paths for a region, computes stats, writes out/<region>.sql
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildTrailRows, toRestSql, toSql } from "./build.ts";
import { GridDem } from "./dem.ts";
import { OpenMeteoProvider } from "./elevation.ts";
import { buildQuery, parseElements, type BBox } from "./overpass.ts";
import { buildRestQuery, parseRestNodes } from "./rest.ts";

const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

const args = process.argv.slice(2);
const noShade = args.includes("--no-shade");
const [region, file] = args.filter((a) => !a.startsWith("--"));
const regions = JSON.parse(readFileSync(new URL("../regions.json", import.meta.url), "utf8")) as Record<string, BBox | string>;
const bbox = regions[region];
if (!Array.isArray(bbox)) {
  console.error(`usage: ingest <region> [overpass.json]\nregions: ${Object.keys(regions).filter((k) => !k.startsWith("_")).join(", ")}`);
  process.exit(1);
}

let json;
if (file) {
  json = JSON.parse(readFileSync(file, "utf8"));
} else {
  const res = await fetch(OVERPASS, { method: "POST", body: new URLSearchParams({ data: buildQuery(bbox) }) });
  if (!res.ok) throw new Error(`overpass ${res.status}`);
  json = await res.json();
}

const overpass = async (query: string) => {
  const res = await fetch(OVERPASS, { method: "POST", body: new URLSearchParams({ data: query }) });
  if (!res.ok) throw new Error(`overpass ${res.status}`);
  return res.json();
};

const ways = parseElements(json);
console.log(`${ways.length} ways`);
const provider = new OpenMeteoProvider();

// Terrain model for sun/shade. 100 m grid + 3 km margin; for production, read a
// local 3DEP GeoTIFF instead (the public elevation API is rate-limited).
const shade = noShade ? undefined : { dem: await GridDem.build(bbox, 100, 3000, provider) };

const rows = await buildTrailRows(ways, region, provider, shade);
const osmSpots = parseRestNodes(await overpass(buildRestQuery(bbox)));
mkdirSync(new URL("../out", import.meta.url), { recursive: true });
writeFileSync(new URL(`../out/${region}.sql`, import.meta.url), toSql(rows));
writeFileSync(new URL(`../out/${region}.rest.sql`, import.meta.url), toRestSql(osmSpots, rows));
console.log(`wrote ${rows.length} trails and ${osmSpots.length} OSM rest spots to out/`);
