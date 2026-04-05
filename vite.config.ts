import { defineConfig } from "vite-plus";
import { yamlPlugin } from "./vite-plugin-yaml.ts";

export default defineConfig({
  plugins: [yamlPlugin()],
  build: {
    target: "es2022",
    outDir: "dist",
  },
});
