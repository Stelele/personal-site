import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import ui from "@nuxt/ui/vite";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  server: {
    port: 5173,
    strictPort: true,
  },
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  plugins: [
    vue(),
    tailwindcss(),
    ui({
      ui: {
        prose: true,
        colors: {
          primary: "blue",
          neutral: "gray",
        },
      },
    }),
  ],
});
