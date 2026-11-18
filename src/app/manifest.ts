import type { MetadataRoute } from "next";

/**
 * El manifest es lo que vuelve "instalable" a la web: le dice al celular el
 * nombre, el icono y que debe abrirse a pantalla completa, como una app.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Finanzas personales",
    short_name: "Finanzas",
    description: "Registro y análisis de gastos personales en MXN",
    lang: "es-MX",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#059669",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
