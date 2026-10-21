/**
 * The two scales, read from `data/*.yaml` once at startup.
 *
 * The YAML is the source of truth and is edited by hand, so it is checked here rather than
 * trusted: a typo that would put an entry at `NaN` fails the build with the entry's name instead
 * of rendering a dot nowhere.
 */

import { parse } from "@std/yaml";

import {
  type Axis,
  type ScaleData,
  type ScaleEntry,
  toAxis,
} from "../client/lib/scale.ts";

const dataDir = new URL("../../data/", import.meta.url);

/** Parses and checks one scale's YAML. */
export function parseScale(source: string, file: string): ScaleData {
  const raw = parse(source) as Partial<ScaleData> | null;
  const meta = raw?.meta;
  if (!meta || typeof meta.title !== "string" || !Array.isArray(raw.entries)) {
    throw new Error(`${file}: needs meta.title and entries`);
  }
  for (const entry of raw.entries as ScaleEntry[]) {
    const ok = typeof entry.name === "string" &&
      (typeof entry.ad === "number" ||
        (typeof entry.value === "number" &&
          typeof entry.exponent === "number")) &&
      (entry.priority === undefined || typeof entry.priority === "number");
    if (!ok) {
      throw new Error(
        `${file}: entry ${
          JSON.stringify(entry.name)
        } needs ad, or value and exponent (and a numeric priority, if any)`,
      );
    }
    entry.description ??= "";
    entry.nameEn ??= "";
  }
  return raw as ScaleData;
}

async function load(name: string): Promise<ScaleData> {
  const file = new URL(`${name}.yaml`, dataDir);
  return parseScale(await Deno.readTextFile(file), `data/${name}.yaml`);
}

/** The year `ad:` entries count back from. A static build is as old as its build. */
const refYear = new Date().getFullYear();

export const scales: Record<"history" | "length" | "money", Axis> = {
  history: toAxis(await load("history"), refYear),
  length: toAxis(await load("length"), refYear),
  money: toAxis(await load("money"), refYear),
};
