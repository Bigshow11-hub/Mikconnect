import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "mikconnect",
    short_name: "mikconnect",
    description: "Pilotez vos zones WiFi et vos tickets, même sur un réseau instable.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f5f7fa",
    theme_color: "#315bde",
    lang: "fr",
    categories: ["business", "utilities"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}
