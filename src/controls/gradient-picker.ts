import type { GradientConfig, GradientType } from '../types';
import { createToggle, createSlider } from './sliders';
import { lerpColor } from '../utils';

export interface GradientPickerOptions {
  label: string;
  value: GradientConfig;
  onChange: (value: GradientConfig) => void;
  /** If true, hide the type (linear/radial) toggle — used for background gradient */
  hideType?: boolean;
}

export function createGradientPicker(opts: GradientPickerOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'gradient-picker';

  if (opts.label) {
    const heading = document.createElement('div');
    heading.className = 'subsection-label';
    heading.textContent = opts.label;
    wrapper.appendChild(heading);
  }

  const current = {
    type: opts.value.type,
    stops: opts.value.stops.map(s => ({ ...s })) as GradientConfig['stops'],
    midpoints: (opts.value.midpoints ? [...opts.value.midpoints] : [0.5, 0.5]) as [number, number],
    angle: opts.value.angle,
  };

  if (!opts.hideType) {
    wrapper.appendChild(createToggle({
      label: 'Type',
      options: [
        { label: 'Linear', value: 'linear' },
        { label: 'Radial', value: 'radial' },
      ],
      value: current.type,
      onChange: (v) => { current.type = v as GradientType; emit(); },
    }));
  }

  // --- Photoshop-style gradient bar with draggable stops + midpoint handles ---
  const barContainer = document.createElement('div');
  barContainer.className = 'grad-bar-container';

  const bar = document.createElement('div');
  bar.className = 'grad-bar';
  barContainer.appendChild(bar);

  // Color stop handles
  const handles: HTMLDivElement[] = [];
  let activeHandle: number | null = null;
  let activeMidpoint: number | null = null;
  let selectedStop = 0;

  for (let i = 0; i < 3; i++) {
    const handle = document.createElement('div');
    handle.className = 'grad-handle';
    if (i === 0) handle.classList.add('selected');
    handle.dataset.index = String(i);
    barContainer.appendChild(handle);
    handles.push(handle);
  }

  // Midpoint diamond handles (between each pair of color stops)
  const midpointHandles: HTMLDivElement[] = [];
  for (let i = 0; i < 2; i++) {
    const mp = document.createElement('div');
    mp.className = 'grad-midpoint-handle';
    mp.dataset.midIndex = String(i);
    mp.title = 'Drag to shift blend midpoint. Double-click to reset.';
    barContainer.appendChild(mp);
    midpointHandles.push(mp);
  }

  wrapper.appendChild(barContainer);

  // Color input for selected stop
  const colorRow = document.createElement('div');
  colorRow.className = 'grad-color-row';

  const colorLabel = document.createElement('span');
  colorLabel.className = 'grad-color-label';
  colorLabel.textContent = 'Color';
  colorRow.appendChild(colorLabel);

  const colorSwatch = document.createElement('input');
  colorSwatch.type = 'color';
  colorSwatch.className = 'color-swatch';
  colorRow.appendChild(colorSwatch);

  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.className = 'hex-input';
  colorRow.appendChild(hexInput);

  wrapper.appendChild(colorRow);

  // Angle slider
  wrapper.appendChild(createSlider({
    label: 'Angle',
    min: 0, max: 360, step: 1,
    value: current.angle,
    onChange: (v) => { current.angle = v; emit(); },
  }));

  // --- Build 5-stop CSS gradient from 3 stops + 2 midpoints ---
  function build5StopGradient(): { colors: string[]; positions: number[] } {
    const colors: string[] = [];
    const positions: number[] = [];

    for (let s = 0; s < 3; s++) {
      colors.push(current.stops[s].color);
      positions.push(current.stops[s].position);
    }

    // Insert midpoint blends
    const m0 = current.midpoints[0];
    const m1 = current.midpoints[1];

    const midColor0 = lerpColor(colors[0], colors[1], 0.5);
    const midPos0 = positions[0] + m0 * (positions[1] - positions[0]);

    const midColor1 = lerpColor(colors[1], colors[2], 0.5);
    const midPos1 = positions[1] + m1 * (positions[2] - positions[1]);

    return {
      colors: [colors[0], midColor0, colors[1], midColor1, colors[2]],
      positions: [positions[0], midPos0, positions[1], midPos1, positions[2]],
    };
  }

  function updateBarGradient() {
    const { colors, positions } = build5StopGradient();
    const cssStops = colors.map((c, i) => `${c} ${positions[i]}%`).join(', ');
    bar.style.background = `linear-gradient(to right, ${cssStops})`;
  }

  function updateHandles() {
    for (let i = 0; i < 3; i++) {
      const h = handles[i];
      h.style.left = `${current.stops[i].position}%`;
      h.style.backgroundColor = current.stops[i].color;
      h.classList.toggle('selected', i === selectedStop);
    }
  }

  function updateMidpointHandles() {
    for (let i = 0; i < 2; i++) {
      const mp = midpointHandles[i];
      const posA = current.stops[i].position;
      const posB = current.stops[i + 1].position;
      const pct = posA + current.midpoints[i] * (posB - posA);
      mp.style.left = `${pct}%`;
    }
  }

  function updateColorInputs() {
    colorSwatch.value = current.stops[selectedStop].color;
    hexInput.value = current.stops[selectedStop].color;
  }

  function selectStop(idx: number) {
    selectedStop = idx;
    updateHandles();
    updateColorInputs();
  }

  // Handle click to select color stops
  for (let i = 0; i < 3; i++) {
    handles[i].addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      selectStop(i);
      activeHandle = i;
    });
  }

  // Midpoint handle interactions
  for (let i = 0; i < 2; i++) {
    midpointHandles[i].addEventListener('mousedown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      activeMidpoint = i;
    });

    midpointHandles[i].addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      current.midpoints[i] = 0.5;
      updateBarGradient();
      updateMidpointHandles();
      emit();
    });
  }

  // Drag logic
  function onMouseMove(e: MouseEvent) {
    const rect = bar.getBoundingClientRect();

    if (activeHandle !== null) {
      let pct = ((e.clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, Math.round(pct)));
      current.stops[activeHandle].position = pct;
      updateBarGradient();
      updateHandles();
      updateMidpointHandles();
      emit();
    }

    if (activeMidpoint !== null) {
      const i = activeMidpoint;
      const posA = current.stops[i].position;
      const posB = current.stops[i + 1].position;
      const range = posB - posA;

      if (range > 0) {
        const pct = ((e.clientX - rect.left) / rect.width) * 100;
        let m = (pct - posA) / range;
        m = Math.max(0.05, Math.min(0.95, m));
        current.midpoints[i] = m;
        updateBarGradient();
        updateMidpointHandles();
        emit();
      }
    }
  }

  function onMouseUp() {
    activeHandle = null;
    activeMidpoint = null;
  }

  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  // Click on bar to select nearest color stop
  bar.addEventListener('click', (e) => {
    const rect = bar.getBoundingClientRect();
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    let nearest = 0;
    let minDist = Infinity;
    for (let i = 0; i < 3; i++) {
      const dist = Math.abs(current.stops[i].position - pct);
      if (dist < minDist) { minDist = dist; nearest = i; }
    }
    selectStop(nearest);
  });

  // Color inputs
  colorSwatch.addEventListener('input', () => {
    current.stops[selectedStop].color = colorSwatch.value;
    hexInput.value = colorSwatch.value;
    updateBarGradient();
    updateHandles();
    emit();
  });

  hexInput.addEventListener('change', () => {
    let v = hexInput.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      current.stops[selectedStop].color = v;
      colorSwatch.value = v;
      updateBarGradient();
      updateHandles();
      emit();
    }
  });

  // Initial render
  updateBarGradient();
  updateHandles();
  updateMidpointHandles();
  updateColorInputs();

  function emit() {
    opts.onChange({
      type: current.type,
      stops: current.stops.map(s => ({ ...s })) as GradientConfig['stops'],
      midpoints: [...current.midpoints] as [number, number],
      angle: current.angle,
    });
  }

  return wrapper;
}
