import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const alt = "KAYHAN Solar & Enerji";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background:
            "linear-gradient(135deg, #0a0f0a 0%, #131a13 50%, #0a0f0a 100%)",
          padding: 64,
          color: "#f0f4f0",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: "#c7ff00",
              color: "#000",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              fontWeight: 700,
            }}
          >
            K
          </div>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 600 }}>
            <span>KAYHAN</span>
            <span style={{ color: "#7a8a7a", marginLeft: 12 }}>Solar</span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ fontSize: 64, fontWeight: 600, lineHeight: 1.1 }}>
            Güneşin Gücü,
          </div>
          <div
            style={{ fontSize: 64, fontWeight: 600, color: "#c7ff00", lineHeight: 1.1 }}
          >
            Senin Kontrolünde
          </div>
          <div style={{ fontSize: 26, color: "#b8c5b8", marginTop: 12 }}>
            Anahtar teslim güneş enerjisi sistemleri
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
