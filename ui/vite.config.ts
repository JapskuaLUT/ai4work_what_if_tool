import path from "path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vite.dev/config/
export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src")
        }
    },
    server: {
        proxy: {
            "/api/ollama": {
                target: "http://localhost:11434/api",
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/api\/ollama/, "")
            }
        }
    }
});
