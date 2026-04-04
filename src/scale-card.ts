import { ScaleEntry, ScaleMeta } from "./types.ts";
import { exponentToY } from "./scroll-engine.ts";

const CARD_HEIGHT = 140; // approximate card height in px

export function createScaleCard(
  entry: ScaleEntry,
  meta: ScaleMeta,
  indexInGroup: number,
): HTMLElement {
  const card = document.createElement("div");
  card.className = "scale-card";
  const baseY = exponentToY(entry.exponent, meta);
  card.style.top = `${baseY + indexInGroup * CARD_HEIGHT}px`;

  card.innerHTML = `
    <div class="scale-card-exponent">${entry.label}</div>
    <div class="scale-card-name">${entry.name}</div>
    <div class="scale-card-name-en">${entry.nameEn}</div>
    <div class="scale-card-desc">${entry.description}</div>
  `;

  return card;
}
