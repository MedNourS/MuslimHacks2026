import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { frontonCompression, obfuscateTailwind, backonProxy } from "@mednours/fronton";

export default defineConfig({
  plugins: [
    react(), tailwindcss(), obfuscateTailwind(), frontonCompression(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon-192.png", "icon-512.png"],
      manifest: {
        name: "Care Circle",
        short_name: "Care Circle",
        description: "Coordinated care for the people looking after an elderly family member.",
        theme_color: "#4A7C6B",
        background_color: "#F5F0E6",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  server: {
    proxy: backonProxy("http://localhost:3000"),
  },
});
