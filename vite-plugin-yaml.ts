import type { Plugin } from "vite-plus";
import * as yaml from "js-yaml";
import * as fs from "node:fs";

export function yamlPlugin(): Plugin {
  return {
    name: "vite-plugin-yaml",
    resolveId(id) {
      if (id.endsWith(".yaml")) {
        return id;
      }
    },
    load(id) {
      if (id.endsWith(".yaml")) {
        const content = fs.readFileSync(id, "utf-8");
        const data = yaml.load(content);
        return `export default ${JSON.stringify(data)};`;
      }
    },
  };
}
