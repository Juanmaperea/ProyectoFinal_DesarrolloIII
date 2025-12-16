import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/login": {
        target: "http://gateway:8000",
        changeOrigin: true,
      },
      "/register": {
        target: "http://gateway:8000",
        changeOrigin: true,
      },
      "/tasks": {
        target: "http://gateway:8000",
        changeOrigin: true,
      },
    },
  },
});
