import type { Plugin } from "vite-plus";
import * as yaml from "js-yaml";
import * as fs from "node:fs";

function processEntry(entry: Record<string, unknown>): Record<string, unknown> {
  if (entry.ad !== undefined) {
    const ad = entry.ad as number;
    const currentYear = new Date().getFullYear();
    const yearsAgo = currentYear - ad;
    if (yearsAgo <= 0) throw new Error(`ad: ${ad} is in the future`);
    const exponent = Math.floor(Math.log10(yearsAgo));
    const value = yearsAgo / Math.pow(10, exponent);
    const { ad: _ad, ...rest } = entry;
    return { ...rest, ad, exponent, value };
  }
  return entry;
}

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
        const data = yaml.load(content) as Record<string, unknown>;
        if (Array.isArray(data?.entries)) {
          data.entries = (data.entries as Record<string, unknown>[]).map(processEntry);
        }
        return `export default ${JSON.stringify(data)};`;
      }
    },
  };
}
