import { ScaleEntry, ScaleMeta } from "./types.ts";
import { toJapaneseLabel } from "./format.ts";

export function createScaleCard(entry: ScaleEntry, meta: ScaleMeta): HTMLElement {
  const card = document.createElement("div");
  card.className = "scale-card";
  const label = toJapaneseLabel(entry.value, entry.exponent, meta.unitSymbol);
  card.innerHTML = `
    <div class="scale-card-exponent">${label}</div>
    <div class="scale-card-name">${entry.name}</div>
    <div class="scale-card-name-en">${entry.nameEn}</div>
    <div class="scale-card-desc">${entry.description}</div>
  `;
  return card;
}
