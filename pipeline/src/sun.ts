export interface SunPosition {
  /** Degrees above the horizon (negative = below). */
  altitude: number;
  /** Degrees clockwise from north. */
  azimuth: number;
}

const rad = Math.PI / 180;

/** NOAA/Spencer approximation; good to well under a degree for our purposes. */
export function sunPosition(utcMs: number, lat: number, lon: number): SunPosition {
  const d = new Date(utcMs);
  const start = Date.UTC(d.getUTCFullYear(), 0, 1);
  const doy = Math.floor((utcMs - start) / 86400000) + 1;
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60;
  const g = ((2 * Math.PI) / 365) * (doy - 1 + (utcHours - 12) / 24);
  const eqTime =
    229.18 *
    (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl =
    0.006918 -
    0.399912 * Math.cos(g) +
    0.070257 * Math.sin(g) -
    0.006758 * Math.cos(2 * g) +
    0.000907 * Math.sin(2 * g) -
    0.002697 * Math.cos(3 * g) +
    0.00148 * Math.sin(3 * g);
  const tst = utcHours * 60 + eqTime + 4 * lon; // true solar time, minutes
  const ha = (tst / 4 - 180) * rad;
  const latR = lat * rad;
  const sinAlt = Math.sin(latR) * Math.sin(decl) + Math.cos(latR) * Math.cos(decl) * Math.cos(ha);
  const altitude = Math.asin(Math.max(-1, Math.min(1, sinAlt))) / rad;
  const az = Math.atan2(Math.sin(ha), Math.cos(ha) * Math.sin(latR) - Math.tan(decl) * Math.cos(latR)) + Math.PI;
  return { altitude, azimuth: ((az / rad) % 360 + 360) % 360 };
}

/** Local clock time (fixed UTC offset, hours) to UTC milliseconds. */
export function localToUtcMs(year: number, month: number, day: number, hour: number, utcOffsetHours: number): number {
  return Date.UTC(year, month - 1, day, hour - utcOffsetHours, 0, 0);
}
