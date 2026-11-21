import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode, command, isPreview }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const apiUrl = env.VITE_TRAVELIAN_API_BASE_URL?.trim();
  if (!apiUrl) {
    throw new Error(`Set VITE_TRAVELIAN_API_BASE_URL in .env.${mode} or .env.${mode}.local`);
  }
  const parsedApiUrl = new URL(apiUrl);
  if (!["http:", "https:"].includes(parsedApiUrl.protocol)) {
    throw new Error("VITE_TRAVELIAN_API_BASE_URL must use HTTP or HTTPS");
  }
  // Browsers on another computer cannot reach this machine's localhost.
  // During development, send gateway requests through the frontend origin.
  const gatewayUrl = env.VITE_TRAVELIAN_GATEWAY_BASE_URL?.trim();
  const gatewayTarget = command === "serve" && !isPreview && gatewayUrl ? new URL(gatewayUrl) : undefined;
  if (gatewayTarget && !["http:", "https:"].includes(gatewayTarget.protocol)) {
    throw new Error("VITE_TRAVELIAN_GATEWAY_BASE_URL must use HTTP or HTTPS");
  }
  if (gatewayTarget?.hostname === "localhost") gatewayTarget.hostname = "127.0.0.1";
  // index.html's absolute links (og:image, twitter:image) use the same site address as the app (src/lib/site-config.ts).
  const siteUrl = (env.VITE_SITE_URL?.trim() || "https://travelian.pk").replace(/\/+$/, "");
  return {
    define: {
      global: "globalThis",
      ...(gatewayTarget ? { "import.meta.env.VITE_TRAVELIAN_GATEWAY_BASE_URL": JSON.stringify("/__gateway") } : {}),
    },
    server: {
      host: "::",
      port: 8080,
      proxy: gatewayTarget ? {
        "^/__gateway(?:/|$)": {
          target: gatewayTarget.toString().replace(/\/+$/, ""),
          changeOrigin: true,
          rewrite: (requestPath) => requestPath.replace(/^\/__gateway(?=\/|$)/, ""),
        },
      } : undefined,
      hmr: {
        overlay: false,
      },
    },
    plugins: [react(), { name: "travelian-site-url", transformIndexHtml: (html: string) => html.replaceAll("%SITE_URL%", siteUrl) }],
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: "react-vendor", test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom|react-helmet-async)[\\/]/, priority: 30 },
              { name: "ui-vendor", test: /[\\/]node_modules[\\/](@radix-ui|lucide-react|cmdk|date-fns|clsx|tailwind-merge|class-variance-authority)[\\/]/, priority: 20 },
            ],
          },
        },
      },
    },
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
