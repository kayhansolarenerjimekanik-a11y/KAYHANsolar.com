export function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export interface LensRect {
  widthPct: number;
  heightPct: number;
  leftPct: number;
  topPct: number;
}

export function computeLensRect(
  posX: number,
  posY: number,
  zoom: number,
): LensRect {
  const size = (1 / zoom) * 100;
  return {
    widthPct: size,
    heightPct: size,
    leftPct: clamp01(posX) * 100 * (1 - 1 / zoom),
    topPct: clamp01(posY) * 100 * (1 - 1 / zoom),
  };
}
