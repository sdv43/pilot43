import { crx, defineManifest } from "@crxjs/vite-plugin"
import babel from "@rolldown/plugin-babel"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import path from "path"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      input: {
        offscreen: "offscreen.html",
        sandbox: "sandbox.html",
      },
    },
  },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    crx({
      manifest: defineManifest({
        icons: {
          "128": "public/128.png",
        },
        action: {
          default_title: "Open Pilot43",
        },
        background: {
          service_worker: "src/background/service-worker.ts",
        },
        content_security_policy: {
          sandbox:
            "sandbox allow-scripts; default-src 'none'; script-src 'self' 'unsafe-eval'; connect-src 'self' chrome-extension:; img-src 'none'; media-src 'none'; object-src 'none'; child-src 'none'; worker-src 'self' blob:;",
        },
        content_scripts: [
          {
            js: ["src/content/content.ts"],
            matches: ["<all_urls>"],
          },
        ],
        host_permissions: ["<all_urls>"],
        manifest_version: 3,
        name: "Pilot43",
        permissions: ["sidePanel", "tabs", "activeTab", "offscreen"],
        sandbox: {
          pages: ["sandbox.html"],
        },
        side_panel: {
          default_path: "sidepanel.html",
        },
        version: "1.0.4",
        description: "Pilot43 provides AI-powered assistance for web browsing.",
      }),
    }),
  ],
})
