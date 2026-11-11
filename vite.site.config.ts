import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// Site de vendas: separado do sistema, sem login e sem acesso ao banco.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss(), viteSingleFile()],
  build: { outDir: "dist-site", assetsInlineLimit: 100000000, cssCodeSplit: false, rollupOptions: { input: "site.html" } },
});
