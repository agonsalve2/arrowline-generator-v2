export interface ColorInputOptions {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function createColorInput(opts: ColorInputOptions): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'control-row color-row';

  const lbl = document.createElement('span');
  lbl.className = 'control-label';
  lbl.textContent = opts.label;

  const inputGroup = document.createElement('div');
  inputGroup.className = 'color-input-group';

  const colorPicker = document.createElement('input');
  colorPicker.type = 'color';
  colorPicker.value = opts.value;
  colorPicker.className = 'color-swatch';

  const hexInput = document.createElement('input');
  hexInput.type = 'text';
  hexInput.value = opts.value;
  hexInput.className = 'hex-input';
  hexInput.maxLength = 7;
  hexInput.pattern = '#[0-9a-fA-F]{6}';

  colorPicker.addEventListener('input', () => {
    hexInput.value = colorPicker.value;
    opts.onChange(colorPicker.value);
  });

  hexInput.addEventListener('change', () => {
    let v = hexInput.value.trim();
    if (!v.startsWith('#')) v = '#' + v;
    if (/^#[0-9a-fA-F]{6}$/.test(v)) {
      colorPicker.value = v;
      opts.onChange(v);
    }
  });

  inputGroup.appendChild(colorPicker);
  inputGroup.appendChild(hexInput);

  wrapper.appendChild(lbl);
  wrapper.appendChild(inputGroup);
  return wrapper;
}
