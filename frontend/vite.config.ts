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
        name: "frontend",
        short_name: "frontend",
        description: "frontend — built with fronton.",
        theme_color: "#0f172a",
        background_color: "#0f172a",
        display: "standalone",
        start_url: "/",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          // A maskable copy of the same file: Android crops the icon to the
          // launcher's own shape, and without a maskable entry it gets
          // letterboxed inside a white rounded square instead. The art is
          // inside the safe zone, so one file serves both purposes.
          { src: "icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // The built app shell. Deliberately not including the compressed
        // .gz/.br copies frontonCompression() emits — precaching both would
        // roughly triple the cache for no benefit, since the service worker
        // serves the plain file and the host handles content negotiation.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
      },
    }),
  ],
  server: {
    proxy: backonProxy("http://localhost:3000"),
  },
});
