import type { BBox } from "./overpass.ts";
import type { ElevationProvider } from "./elevation.ts";

export interface TerrainSampler {
  /** Ground elevation in meters at a location. */
  elevationAt(lon: number, lat: number): number;
  /** Highest elevation in the sampled area (bounds shadow ray length). */
  readonly maxElevationM: number;
}

const M_PER_DEG_LAT = 111320;

/** Regular lon/lat grid with bilinear sampling. */
export class GridDem implements TerrainSampler {
  readonly maxElevationM: number;
  private west: number;
  private south: number;
  private dLon: number;
  private dLat: number;
  private cols: number;
  private rows: number;
  private data: Float32Array;

  private constructor(west: number, south: number, dLon: number, dLat: number, cols: number, rows: number, data: Float32Array) {
    this.west = west;
    this.south = south;
    this.dLon = dLon;
    this.dLat = dLat;
    this.cols = cols;
    this.rows = rows;
    this.data = data;
    this.maxElevationM = data.reduce((m, v) => Math.max(m, v), -Infinity);
  }

  /**
   * Builds a grid covering `bbox` plus `marginM` (shadow rays reach outside
   * the trail area). Production should read a local 3DEP/SRTM GeoTIFF; this
   * path samples through an ElevationProvider for convenience.
   */
  static async build(bbox: BBox, spacingM: number, marginM: number, provider: ElevationProvider): Promise<GridDem> {
    const midLat = (bbox[0] + bbox[2]) / 2;
    const dLat = spacingM / M_PER_DEG_LAT;
    const dLon = spacingM / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180));
    const south = bbox[0] - marginM / M_PER_DEG_LAT;
    const north = bbox[2] + marginM / M_PER_DEG_LAT;
    const west = bbox[1] - marginM / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180));
    const east = bbox[3] + marginM / (M_PER_DEG_LAT * Math.cos((midLat * Math.PI) / 180));
    const cols = Math.ceil((east - west) / dLon) + 1;
    const rows = Math.ceil((north - south) / dLat) + 1;
    const pts: [number, number][] = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) pts.push([west + c * dLon, south + r * dLat]);
    const ele = await provider.elevations(pts);
    return new GridDem(west, south, dLon, dLat, cols, rows, Float32Array.from(ele));
  }

  elevationAt(lon: number, lat: number): number {
    const x = Math.min(this.cols - 1.001, Math.max(0, (lon - this.west) / this.dLon));
    const y = Math.min(this.rows - 1.001, Math.max(0, (lat - this.south) / this.dLat));
    const c = Math.floor(x);
    const r = Math.floor(y);
    const fx = x - c;
    const fy = y - r;
    const at = (cc: number, rr: number) => this.data[rr * this.cols + cc];
    return (
      at(c, r) * (1 - fx) * (1 - fy) + at(c + 1, r) * fx * (1 - fy) + at(c, r + 1) * (1 - fx) * fy + at(c + 1, r + 1) * fx * fy
    );
  }
}
