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

/**
 * Yalnizca https:// ile baslayan URL'leri kabul eder. javascript:, data:,
 * relative path, http:// hepsi reddedilir. ZoomImage'in background-image
 * src'sini guvenli tutmak icin gerekli.
 */
export function isHttpsUrl(s: string): boolean {
  return /^https:\/\//.test(s);
}

/**
 * Bir URL'i CSS `url("...")` ifadesi icinde guvenli kullanima hazirlar.
 * Cift tirnak, ters bolu ve parantezler url() / string syntax'ini bozabilir
 * (CSS injection); URL kodlamasi ile zararsiz hale getirilir.
 */
export function escapeCssUrl(s: string): string {
  return s
    .replaceAll("\\", "%5C")
    .replaceAll('"', "%22")
    .replaceAll("(", "%28")
    .replaceAll(")", "%29");
}
