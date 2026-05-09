/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/static/",
  build: { outDir: "dist", assetsDir: "" },
  plugins: [react(), tailwindcss()],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  server: {
    port: 5000,
    strictPort: true,
    proxy: {
      "/ws":         { target: "ws://localhost:8080", ws: true },
      "/frame.mjpg": "http://localhost:8080",
      "/frame.jpg":  "http://localhost:8080",
      "/api":        "http://localhost:8080",
      "/sounds":     "http://localhost:8080",
      "/assets":     "http://localhost:8080",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
  },
});
