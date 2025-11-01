import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "ChatOkay - Asistente de Citas con IA para Negocios";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 60,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontFamily: "system-ui",
          padding: "80px",
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            marginBottom: 20,
          }}
        >
          ChatOkay
        </div>
        <div
          style={{
            fontSize: 40,
            fontWeight: "normal",
            opacity: 0.9,
            maxWidth: "900px",
            lineHeight: 1.4,
          }}
        >
          Asistente de Citas con IA para Negocios
        </div>
        <div
          style={{
            fontSize: 30,
            marginTop: 40,
            opacity: 0.8,
          }}
        >
          Automatiza • Integra • Gestiona 24/7
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}

