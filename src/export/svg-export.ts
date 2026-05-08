export function exportSvg(svg: SVGSVGElement, filename: string = 'blend.svg'): void {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const vb = svg.viewBox.baseVal;
  clone.setAttribute('width', String(vb.width));
  clone.setAttribute('height', String(vb.height));
  clone.removeAttribute('style');

  const serializer = new XMLSerializer();
  const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);
  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  downloadBlob(blob, filename);
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
