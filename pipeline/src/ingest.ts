// Usage: node src/ingest.ts <region> [path/to/overpass.json]
// Fetches (or reads) OSM paths for a region, computes stats, writes out/<region>.sql
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { buildTrailRows, toSql } from "./build.ts";
import { OpenMeteoProvider } from "./elevation.ts";
import { buildQuery, parseElements, type BBox } from "./overpass.ts";

const OVERPASS = process.env.OVERPASS_URL ?? "https://overpass-api.de/api/interpreter";

const [region, file] = process.argv.slice(2);
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

const ways = parseElements(json);
console.log(`${ways.length} ways`);
const rows = await buildTrailRows(ways, region, new OpenMeteoProvider());
mkdirSync(new URL("../out", import.meta.url), { recursive: true });
writeFileSync(new URL(`../out/${region}.sql`, import.meta.url), toSql(rows));
console.log(`wrote ${rows.length} trails to out/${region}.sql`);
