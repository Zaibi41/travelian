import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiUrl = env.VITE_TRAVELIAN_API_BASE_URL?.trim();
  if (!apiUrl) {
    throw new Error(`Set VITE_TRAVELIAN_API_BASE_URL in .env.${mode} or .env.${mode}.local`);
  }
  const parsedApiUrl = new URL(apiUrl);
  if (!["http:", "https:"].includes(parsedApiUrl.protocol)) {
    throw new Error("VITE_TRAVELIAN_API_BASE_URL must use HTTP or HTTPS");
  }
  return {
    define: {
      global: "globalThis",
    },
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
    optimizeDeps: {
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
  };
});
