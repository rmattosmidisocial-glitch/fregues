import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Cada área carrega só o que usa: a loja do cliente não baixa o painel, o mapa nem a administração.
export default defineConfig({
  base: "/",
  // versão no ar (commit), para o monitor de erros dizer em qual versão aconteceu
  define: { "import.meta.env.VITE_VERSAO": JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA || "local").slice(0, 7)) },
  plugins: [react(), tailwindcss()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) return "react";
          if (id.includes("node_modules/@supabase")) return "supabase";
          if (id.includes("bairros-rj.topo.json") || id.includes("rj-municipios.json") || id.includes("node_modules/d3-") || id.includes("node_modules/topojson")) return "mapas";
        },
      },
    },
  },
});
