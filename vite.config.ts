import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@workspace/api-client-react": path.resolve(
        import.meta.dirname,
        "src/lib/api-client-react.ts",
      ),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    target: "esnext",
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    esbuildOptions: {
      target: "esnext",
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    host: "127.0.0.1",
    allowedHosts: true,
    fs: {
      strict: true,
    },
  },
  preview: {
    port: 4173,
    host: "127.0.0.1",
    allowedHosts: true,
  },
});
