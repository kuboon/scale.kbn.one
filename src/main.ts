import "./style.css";
import historyData from "../data/history.yaml";
import lengthData from "../data/length.yaml";
import { ScaleData } from "./types";
import { renderLanding } from "./landing";
import { renderExplorer, destroyExplorer } from "./explorer";

const app = document.getElementById("app")!;

const scales: Record<string, ScaleData> = {
  history: historyData as unknown as ScaleData,
  length: lengthData as unknown as ScaleData,
};

function route() {
  destroyExplorer();
  const hash = location.hash.replace("#", "");

  if (hash === "history" || hash === "length") {
    renderExplorer(app, scales[hash]);
  } else {
    renderLanding(app);
  }
}

window.addEventListener("hashchange", route);
route();
