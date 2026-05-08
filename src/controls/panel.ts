import type { BlendConfig, CurveMode, ZOrder, BlendPosition, PresetStyle } from '../types';
import { createSlider, createToggle } from './sliders';

interface Tab {
  label: string;
  id: string;
  build: (container: HTMLElement) => void;
}

export function buildControlsPanel(
  container: HTMLElement,
  config: BlendConfig,
  onChange: () => void,
  onExport: (format: string) => void,
  onTogglePlay: () => boolean,
  isPlaying: boolean,
  _onLoadPreset: (style: PresetStyle) => void,
): void {
  container.innerHTML = '';

  const tabContents: Map<string, HTMLElement> = new Map();
  let activeTabId: string | null = null;

  // --- Define tabs ---
  const tabs: Tab[] = [
    {
      label: 'Path',
      id: 'path',
      build: (el) => {
        el.appendChild(createCanvasControls(config, onChange));
        el.appendChild(createSlider({
          label: 'Twist', min: 0, max: 100, step: 1, value: config.twist * 100,
          onChange: (v) => { config.twist = v / 100; onChange(); },
        }));
        el.appendChild(createToggle({
          label: 'Curve',
          options: [{ label: 'Arc', value: 'arc' }, { label: 'S-Curve', value: 's-curve' }],
          value: config.curveMode,
          onChange: (v) => { config.curveMode = v as CurveMode; onChange(); },
        }));
        el.appendChild(createToggle({
          label: 'Direction',
          options: [{ label: 'Left', value: '1' }, { label: 'Right', value: '-1' }],
          value: String(config.twistDirection),
          onChange: (v) => { config.twistDirection = parseInt(v) as 1 | -1; onChange(); },
        }));
        el.appendChild(createToggle({
          label: 'Position',
          options: [
            { label: 'BL', value: 'bottom-left' },
            { label: 'BR', value: 'bottom-right' },
            { label: 'TL', value: 'top-left' },
            { label: 'TR', value: 'top-right' },
            { label: 'Center', value: 'center' },
          ],
          value: config.blendPosition,
          onChange: (v) => { config.blendPosition = v as BlendPosition; onChange(); },
        }));
      },
    },
    {
      label: 'Rectangles',
      id: 'rectangles',
      build: (el) => {
        el.appendChild(createSlider({
          label: 'Count', min: 3, max: 30, step: 1, value: config.count,
          onChange: (v) => { config.count = v; onChange(); },
        }));
        el.appendChild(createSlider({
          label: 'Corner Radius', min: 5, max: 10, step: 1, value: config.cornerRadius,
          onChange: (v) => { config.cornerRadius = v; onChange(); },
        }));
        const onTopRow = createToggle({
          label: 'On Top',
          options: [
            { label: 'Rectangle A', value: 'small-front' },
            { label: 'Rectangle B', value: 'large-front' },
          ],
          value: config.zOrder,
          onChange: (v) => { config.zOrder = v as ZOrder; onChange(); },
        });
        onTopRow.style.marginTop = '14px';
        onTopRow.style.marginBottom = '14px';
        el.appendChild(onTopRow);

        const sub1 = subsection(el, 'Rectangle A');
        sub1.appendChild(createSlider({
          label: 'Width', min: 5, max: 400, step: 1, value: config.minWidth,
          onChange: (v) => { config.minWidth = v; onChange(); },
        }));
        sub1.appendChild(createSlider({
          label: 'Height', min: 10, max: 800, step: 1, value: config.minHeight,
          onChange: (v) => { config.minHeight = v; onChange(); },
        }));

        const sub2 = subsection(el, 'Rectangle B');
        sub2.appendChild(createSlider({
          label: 'Width', min: 5, max: 400, step: 1, value: config.maxWidth,
          onChange: (v) => { config.maxWidth = v; onChange(); },
        }));
        sub2.appendChild(createSlider({
          label: 'Height', min: 10, max: 800, step: 1, value: config.maxHeight,
          onChange: (v) => { config.maxHeight = v; onChange(); },
        }));
      },
    },
    {
      label: 'Motion',
      id: 'motion',
      build: (el) => {
        el.appendChild(createSlider({
          label: 'Speed', min: -0.8, max: 0.8, step: 0.05, value: config.marchSpeed,
          onChange: (v) => { config.marchSpeed = v; onChange(); },
        }));

        const playBtn = document.createElement('button');
        playBtn.className = 'export-btn play-btn';
        playBtn.textContent = isPlaying ? 'Pause' : 'Play';
        playBtn.addEventListener('click', () => {
          const nowPlaying = onTogglePlay();
          playBtn.textContent = nowPlaying ? 'Pause' : 'Play';
        });
        el.appendChild(playBtn);
      },
    },
    {
      label: 'Export',
      id: 'export',
      build: (el) => {
        const formats = ['SVG', 'PNG', 'WebP', 'Animated HTML'];
        for (const fmt of formats) {
          const btn = document.createElement('button');
          btn.className = 'export-btn';
          btn.textContent = `Download ${fmt}`;
          btn.addEventListener('click', () => onExport(fmt));
          el.appendChild(btn);
        }
      },
    },
  ];

  // --- Build tab content panels ---
  for (const tab of tabs) {
    const content = document.createElement('div');
    content.className = 'tab-content';
    content.dataset.tab = tab.id;
    tab.build(content);
    container.appendChild(content);
    tabContents.set(tab.id, content);
  }

  // --- Build tab bar ---
  const tabBar = document.createElement('div');
  tabBar.className = 'tab-bar';

  const labelsRow = document.createElement('div');
  labelsRow.className = 'tab-bar-labels';

  const tabButtons: Map<string, HTMLButtonElement> = new Map();

  for (const tab of tabs) {
    const btn = document.createElement('button');
    btn.className = 'tab-label';
    btn.textContent = tab.label;
    btn.addEventListener('click', () => {
      if (activeTabId === tab.id) {
        // Click active tab = collapse
        activeTabId = null;
        tabContents.forEach(c => c.classList.remove('active'));
        tabButtons.forEach(b => b.classList.remove('active'));
      } else {
        activeTabId = tab.id;
        tabContents.forEach(c => c.classList.toggle('active', c.dataset.tab === tab.id));
        tabButtons.forEach((b, id) => b.classList.toggle('active', id === tab.id));
      }
    });
    labelsRow.appendChild(btn);
    tabButtons.set(tab.id, btn);
  }

  const logo = document.createElement('img');
  logo.src = '/logo.png';
  logo.className = 'tab-bar-logo';
  logo.alt = '';

  tabBar.appendChild(logo);
  tabBar.appendChild(labelsRow);
  container.appendChild(tabBar);
}

function subsection(parent: HTMLElement, title: string): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'control-subsection';
  const h = document.createElement('h4');
  h.textContent = title;
  wrapper.appendChild(h);
  parent.appendChild(wrapper);
  return wrapper;
}

function createCanvasControls(config: BlendConfig, onChange: () => void): HTMLElement {
  const PRESETS: { label: string; w: number; h: number }[] = [
    { label: '16:9', w: 1920, h: 1080 },
    { label: '4:3', w: 1440, h: 1080 },
    { label: '1:1', w: 1080, h: 1080 },
    { label: '9:16', w: 1080, h: 1920 },
  ];

  const container = document.createElement('div');
  container.style.marginBottom = '14px';
  container.style.display = 'flex';
  container.style.gap = '8px';

  // --- Block 1: Canvas Size ---
  const sizeBlock = document.createElement('div');
  sizeBlock.className = 'control-subsection';
  const sizeTitle = document.createElement('h4');
  sizeTitle.textContent = 'Canvas Size';
  sizeBlock.appendChild(sizeTitle);

  const dimRow = document.createElement('div');
  dimRow.className = 'control-row';

  function makeNumInput(value: number): HTMLInputElement {
    const inp = document.createElement('input');
    inp.type = 'number';
    inp.className = 'control-value-input canvas-dim-input';
    inp.value = String(value);
    inp.min = '100';
    inp.max = '9999';
    inp.step = '1';
    return inp;
  }

  const wLabel = document.createElement('span');
  wLabel.className = 'control-label';
  wLabel.textContent = 'W';
  wLabel.style.minWidth = '16px';

  const wInput = makeNumInput(config.canvasWidth);

  const hLabel = document.createElement('span');
  hLabel.className = 'control-label';
  hLabel.textContent = 'H';
  hLabel.style.minWidth = '16px';

  const hInput = makeNumInput(config.canvasHeight);

  wInput.addEventListener('change', () => {
    const v = parseInt(wInput.value, 10);
    if (!isNaN(v) && v >= 100) { config.canvasWidth = v; syncRatioButtons(); onChange(); }
    else wInput.value = String(config.canvasWidth);
  });
  hInput.addEventListener('change', () => {
    const v = parseInt(hInput.value, 10);
    if (!isNaN(v) && v >= 100) { config.canvasHeight = v; syncRatioButtons(); onChange(); }
    else hInput.value = String(config.canvasHeight);
  });
  wInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); });
  hInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); });

  dimRow.appendChild(wLabel);
  dimRow.appendChild(wInput);
  dimRow.appendChild(hLabel);
  dimRow.appendChild(hInput);
  sizeBlock.style.flex = '1';
  sizeBlock.style.margin = '0';
  sizeBlock.appendChild(dimRow);

  // --- Block 2: Canvas Ratio ---
  const ratioBlock = document.createElement('div');
  ratioBlock.className = 'control-subsection';
  const ratioTitle = document.createElement('h4');
  ratioTitle.textContent = 'Canvas Ratio';
  ratioBlock.appendChild(ratioTitle);

  const ratioGroup = document.createElement('div');
  ratioGroup.className = 'toggle-group';

  function syncRatioButtons() {
    ratioGroup.querySelectorAll<HTMLButtonElement>('.toggle-btn').forEach((btn, i) => {
      const p = PRESETS[i];
      btn.classList.toggle('active', config.canvasWidth === p.w && config.canvasHeight === p.h);
    });
  }

  for (const preset of PRESETS) {
    const btn = document.createElement('button');
    btn.textContent = preset.label;
    btn.className = 'toggle-btn';
    btn.addEventListener('click', () => {
      config.canvasWidth = preset.w;
      config.canvasHeight = preset.h;
      wInput.value = String(preset.w);
      hInput.value = String(preset.h);
      syncRatioButtons();
      onChange();
    });
    ratioGroup.appendChild(btn);
  }

  syncRatioButtons();
  ratioBlock.style.flex = '1';
  ratioBlock.style.margin = '0';
  ratioBlock.appendChild(ratioGroup);

  container.appendChild(sizeBlock);
  container.appendChild(ratioBlock);
  return container;
}
