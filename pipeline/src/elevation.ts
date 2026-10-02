import type { Point } from "./geo.ts";

export interface ElevationProvider {
  /** Elevations in meters, same order as input. */
  elevations(points: Point[]): Promise<number[]>;
}

/**
 * Open-Meteo elevation API (Copernicus 90 m DEM). Free for non-commercial use
 * and rate-limited: fine for development. For production, sample a local
 * 3DEP / SRTM GeoTIFF instead (implement ElevationProvider).
 */
export class OpenMeteoProvider implements ElevationProvider {
  private baseUrl: string;

  constructor(baseUrl = "https://api.open-meteo.com/v1/elevation") {
    this.baseUrl = baseUrl;
  }

  async elevations(points: Point[]): Promise<number[]> {
    const out: number[] = [];
    for (let i = 0; i < points.length; i += 100) {
      const chunk = points.slice(i, i + 100);
      const url = `${this.baseUrl}?latitude=${chunk.map((p) => p[1].toFixed(5)).join(",")}&longitude=${chunk
        .map((p) => p[0].toFixed(5))
        .join(",")}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`elevation API ${res.status}`);
      const body = (await res.json()) as { elevation: number[] };
      out.push(...body.elevation);
    }
    return out;
  }
}
