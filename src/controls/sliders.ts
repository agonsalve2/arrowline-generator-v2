export interface SliderOptions {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
}

export function createSlider(opts: SliderOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'control-row';

  const lbl = document.createElement('span');
  lbl.className = 'control-label';
  lbl.textContent = opts.label;

  // Editable value input
  const valueInput = document.createElement('input');
  valueInput.type = 'text';
  valueInput.className = 'control-value-input';
  valueInput.value = String(opts.value);

  const range = document.createElement('input');
  range.type = 'range';
  range.min = String(opts.min);
  range.max = String(opts.max);
  range.step = String(opts.step);
  range.value = String(opts.value);

  range.addEventListener('input', () => {
    const v = parseFloat(range.value);
    valueInput.value = String(v);
    opts.onChange(v);
  });

  valueInput.addEventListener('change', () => {
    let v = parseFloat(valueInput.value);
    if (isNaN(v)) v = opts.value;
    v = Math.max(opts.min, Math.min(opts.max, v));
    // Snap to step
    v = Math.round(v / opts.step) * opts.step;
    v = parseFloat(v.toFixed(10)); // avoid float artifacts
    valueInput.value = String(v);
    range.value = String(v);
    opts.onChange(v);
  });

  valueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') valueInput.blur();
  });

  wrapper.appendChild(lbl);
  wrapper.appendChild(valueInput);
  wrapper.appendChild(range);
  return wrapper;
}

export interface ToggleOptions {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export function createToggle(opts: ToggleOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'toggle-row';

  const lbl = document.createElement('span');
  lbl.className = 'toggle-row-label';
  lbl.textContent = opts.label;
  wrapper.appendChild(lbl);

  const btnGroup = document.createElement('div');
  btnGroup.className = 'toggle-group';

  for (const opt of opts.options) {
    const btn = document.createElement('button');
    btn.textContent = opt.label;
    btn.className = 'toggle-btn' + (opt.value === opts.value ? ' active' : '');
    btn.addEventListener('click', () => {
      btnGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      opts.onChange(opt.value);
    });
    btnGroup.appendChild(btn);
  }

  wrapper.appendChild(btnGroup);
  return wrapper;
}
