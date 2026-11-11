import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  // Garde le nom de variable déjà configuré sur Vercel (REACT_APP_BACKEND_URL).
  envPrefix: "REACT_APP_",
  server: { port: 3000 },
  // Même dossier de sortie que CRA : réglages d'hébergement inchangés.
  build: { outDir: "build" },
  test: { environment: "node" },
});
