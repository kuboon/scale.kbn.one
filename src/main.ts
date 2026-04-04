import './style.css';
import timeData from '../data/time.yaml';
import lengthData from '../data/length.yaml';
import { ScaleData } from './types';
import { renderLanding } from './landing';
import { renderExplorer, destroyExplorer } from './explorer';

const app = document.getElementById('app')!;

const scales: Record<string, ScaleData> = {
  time: timeData as unknown as ScaleData,
  length: lengthData as unknown as ScaleData,
};

function route() {
  destroyExplorer();
  const hash = location.hash.replace('#', '');

  if (hash === 'time' || hash === 'length') {
    renderExplorer(app, scales[hash]);
  } else {
    renderLanding(app);
  }
}

window.addEventListener('hashchange', route);
route();
