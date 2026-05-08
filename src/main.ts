import { DEFAULT_CONFIG } from './types';
import type { BlendConfig, PresetStyle } from './types';
import { generateBlend } from './engine/blend';
import { BlendRenderer } from './engine/renderer';
import { buildControlsPanel } from './controls/panel';
import { createPresetPicker, loadPresets } from './controls/presets';
import { exportSvg } from './export/svg-export';
import { exportRaster } from './export/raster-export';
import { exportAnimatedHtml, startMarchAnimation, stopMarchAnimation } from './export/animation-export';
import './style.css';

const config: BlendConfig = { ...DEFAULT_CONFIG };

const controlsEl = document.getElementById('controls')!;
const previewEl = document.getElementById('preview')!;

const renderer = new BlendRenderer(previewEl);

let isPlaying = false;
let rafId = 0;

function scheduleRender() {
  if (isPlaying) return; // animation loop reads config live, no extra render needed
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(render);
}

function render() {
  const rects = generateBlend(config, config.canvasWidth, config.canvasHeight);
  renderer.render(rects, config);
}

function handleExport(format: string) {
  const svg = renderer.getSvgElement();
  switch (format) {
    case 'SVG':
      exportSvg(svg);
      break;
    case 'PNG':
      exportRaster(svg, 'image/png', 'blend.png');
      break;
    case 'WebP':
      exportRaster(svg, 'image/webp', 'blend.webp');
      break;
    case 'Animated HTML':
      exportAnimatedHtml(svg, config);
      break;
  }
}

function handleTogglePlay(): boolean {
  isPlaying = !isPlaying;
  if (isPlaying) {
    startMarchAnimation(renderer, config);
  } else {
    stopMarchAnimation();
    render();
  }
  return isPlaying;
}

function handleLoadPreset(style: PresetStyle) {
  Object.assign(config, style);
  buildControlsPanel(controlsEl, config, scheduleRender, handleExport, handleTogglePlay, isPlaying, handleLoadPreset);
  scheduleRender();
}

const appEl = document.getElementById('app')!;

(async () => {
  const presets = await loadPresets();
  const redPreset = presets.find(p => p.name === 'Red');
  if (redPreset) Object.assign(config, redPreset.config);

  buildControlsPanel(controlsEl, config, scheduleRender, handleExport, handleTogglePlay, isPlaying, handleLoadPreset);
  appEl.appendChild(createPresetPicker(handleLoadPreset));
  window.addEventListener('resize', scheduleRender);
  requestAnimationFrame(render);
})();
