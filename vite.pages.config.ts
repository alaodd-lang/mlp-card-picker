import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/mlp-card-picker/",
  plugins: [react()],
  publicDir: "public",
  build: {
    outDir: "dist-pages",
    emptyOutDir: true,
  },
});
