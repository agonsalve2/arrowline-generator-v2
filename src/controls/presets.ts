import type { BlendConfig, PresetStyle } from '../types';

const STORAGE_KEY = 'al-blend-presets';
const API_URL = '/api/presets';

const STYLE_KEYS: (keyof PresetStyle)[] = [
  'cornerRadius', 'strokeWidth', 'strokeColor', 'zOrder',
  'fillMode', 'fillColor', 'gradientStart', 'gradientEnd',
  'backgroundMode', 'bgGradient',
  'marchSpeed',
];

function extractStyle(config: BlendConfig): PresetStyle {
  const style = {} as PresetStyle;
  for (const key of STYLE_KEYS) {
    (style as any)[key] = JSON.parse(JSON.stringify(config[key]));
  }
  return style;
}

export interface Preset {
  name: string;
  config: PresetStyle;
  createdAt: number;
}

let cache: Preset[] | null = null;

function readLocal(): Preset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeLocal(presets: Preset[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
  } catch {
    // ignore quota / disabled storage
  }
}

async function writeRemote(presets: Preset[]): Promise<boolean> {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(presets),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function normalisePresets(raw: unknown[]): Preset[] {
  return raw.map((p: any) => ({
    name: p.name,
    createdAt: p.createdAt ?? 0,
    config: extractStyle(p.config as BlendConfig),
  }));
}

export async function loadPresets(): Promise<Preset[]> {
  if (cache) return cache;
  try {
    const res = await fetch(API_URL);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        cache = normalisePresets(data);
        writeLocal(cache);
        return cache;
      }
    }
  } catch {
    // fall through
  }
  const local = readLocal();
  if (local.length > 0) {
    cache = normalisePresets(local);
    return cache;
  }
  try {
    const res = await fetch('/presets.json');
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        cache = normalisePresets(data);
        return cache;
      }
    }
  } catch {
    // ignore
  }
  cache = [];
  return cache;
}

export async function savePreset(name: string, config: BlendConfig): Promise<void> {
  const presets = await loadPresets();
  const preset: Preset = {
    name,
    config: extractStyle(config),
    createdAt: Date.now(),
  };
  const idx = presets.findIndex(p => p.name === name);
  if (idx >= 0) {
    presets[idx] = preset;
  } else {
    presets.push(preset);
  }
  cache = presets;
  writeLocal(presets);
  const ok = await writeRemote(presets);
  if (!ok) {
    console.warn('[presets] could not write to /api/presets — saved to localStorage only. Run `npm run dev` to persist to disk.');
  }
}

export async function deletePreset(name: string): Promise<void> {
  const presets = (await loadPresets()).filter(p => p.name !== name);
  cache = presets;
  writeLocal(presets);
  const ok = await writeRemote(presets);
  if (!ok) {
    console.warn('[presets] could not write to /api/presets — saved to localStorage only.');
  }
}

export function createPresetPicker(
  onLoad: (style: PresetStyle) => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.id = 'preset-picker';

  const list = document.createElement('div');
  list.className = 'preset-hover-list';
  wrapper.appendChild(list);

  const trigger = document.createElement('button');
  trigger.className = 'preset-trigger';
  trigger.textContent = 'Theme';
  wrapper.appendChild(trigger);

  async function refreshList() {
    list.innerHTML = '';
    const presets = await loadPresets();
    if (presets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'preset-empty';
      empty.textContent = 'No saved presets';
      list.appendChild(empty);
      return;
    }
    for (const preset of presets) {
      const item = document.createElement('button');
      item.className = 'preset-hover-item';
      item.textContent = preset.name;
      item.addEventListener('click', () => {
        onLoad(JSON.parse(JSON.stringify(preset.config)) as PresetStyle);
      });
      list.appendChild(item);
    }
  }

  wrapper.addEventListener('mouseenter', refreshList);
  return wrapper;
}

export function createPresetsUI(
  config: BlendConfig,
  onLoad: (style: PresetStyle) => void,
): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'presets-section';

  async function rebuild() {
    wrapper.innerHTML = '';

    // Save row
    const saveRow = document.createElement('div');
    saveRow.className = 'preset-save-row';

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'preset-name-input';
    input.placeholder = 'Preset name…';
    saveRow.appendChild(input);

    const saveBtn = document.createElement('button');
    saveBtn.className = 'preset-save-btn';
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', async () => {
      const name = input.value.trim();
      if (!name) return;
      saveBtn.disabled = true;
      await savePreset(name, config);
      input.value = '';
      saveBtn.disabled = false;
      rebuild();
    });
    saveRow.appendChild(saveBtn);
    wrapper.appendChild(saveRow);

    // List
    const presets = await loadPresets();
    if (presets.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'preset-empty';
      empty.textContent = 'No saved presets';
      wrapper.appendChild(empty);
      return;
    }

    const list = document.createElement('div');
    list.className = 'preset-list';

    for (const preset of presets) {
      const item = document.createElement('div');
      item.className = 'preset-item';

      const nameEl = document.createElement('span');
      nameEl.className = 'preset-item-name';
      nameEl.textContent = preset.name;
      nameEl.addEventListener('click', () => {
        onLoad(JSON.parse(JSON.stringify(preset.config)) as PresetStyle);
      });
      item.appendChild(nameEl);

      const delBtn = document.createElement('button');
      delBtn.className = 'preset-delete-btn';
      delBtn.textContent = '×';
      delBtn.title = 'Delete preset';
      delBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        await deletePreset(preset.name);
        rebuild();
      });
      item.appendChild(delBtn);

      list.appendChild(item);
    }
    wrapper.appendChild(list);
  }

  rebuild();
  return wrapper;
}
