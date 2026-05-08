import type { BlendConfig, RectDescriptor, GradientConfig } from '../types';
import { lerpColor, lerp } from '../utils';

const SVG_NS = 'http://www.w3.org/2000/svg';
const STOPS_PER_GRAD = 5; // 3 color stops + 2 midpoint blends

/**
 * Build 5 gradient stops from a GradientConfig (3 colors + 2 midpoints).
 */
function expand5Stops(cfg: GradientConfig): { colors: string[]; positions: number[] } {
  const mid = cfg.midpoints ?? [0.5, 0.5];
  const c = cfg.stops.map(s => s.color);
  const p = cfg.stops.map(s => s.position);

  return {
    colors: [c[0], lerpColor(c[0], c[1], 0.5), c[1], lerpColor(c[1], c[2], 0.5), c[2]],
    positions: [p[0], p[0] + mid[0] * (p[1] - p[0]), p[1], p[1] + mid[1] * (p[2] - p[1]), p[2]],
  };
}

export class BlendRenderer {
  private svg: SVGSVGElement;
  private defs: SVGDefsElement;
  private bgRect: SVGRectElement;
  private rectsGroup: SVGGElement;
  private rectElements: SVGRectElement[] = [];
  private clipRect: SVGRectElement;

  // Gradient element cache for performance
  private gradCache: Map<string, SVGGradientElement> = new Map();
  private bgGradEl: SVGGradientElement | null = null;
  private bgStopEls: SVGStopElement[] = [];

  constructor(container: HTMLElement) {
    this.svg = document.createElementNS(SVG_NS, 'svg');
    this.svg.setAttribute('xmlns', SVG_NS);
    this.svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    this.svg.style.width = '100%';
    this.svg.style.height = '100%';

    this.defs = document.createElementNS(SVG_NS, 'defs');
    this.svg.appendChild(this.defs);

    const clipPath = document.createElementNS(SVG_NS, 'clipPath');
    clipPath.id = 'canvas-clip';
    this.clipRect = document.createElementNS(SVG_NS, 'rect');
    clipPath.appendChild(this.clipRect);
    this.defs.appendChild(clipPath);

    this.bgRect = document.createElementNS(SVG_NS, 'rect');
    this.svg.appendChild(this.bgRect);

    this.rectsGroup = document.createElementNS(SVG_NS, 'g');
    this.rectsGroup.setAttribute('clip-path', 'url(#canvas-clip)');
    this.svg.appendChild(this.rectsGroup);

    container.appendChild(this.svg);
  }

  getSvgElement(): SVGSVGElement {
    return this.svg;
  }

  getSize(): { width: number; height: number } {
    const vb = this.svg.viewBox.baseVal;
    if (vb.width > 0) return { width: vb.width, height: vb.height };
    const rect = this.svg.getBoundingClientRect();
    return { width: rect.width, height: rect.height };
  }

  render(rects: RectDescriptor[], config: BlendConfig): void {
    const width = config.canvasWidth;
    const height = config.canvasHeight;
    this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    this.clipRect.setAttribute('width', String(width));
    this.clipRect.setAttribute('height', String(height));
    this.bgRect.setAttribute('width', String(width));
    this.bgRect.setAttribute('height', String(height));

    this.updateBackground(config);
    this.updateGradientDefs(rects, config);

    // Sync rect elements pool
    while (this.rectElements.length > rects.length) {
      const el = this.rectElements.pop()!;
      this.rectsGroup.removeChild(el);
    }
    while (this.rectElements.length < rects.length) {
      const el = document.createElementNS(SVG_NS, 'rect');
      this.rectsGroup.appendChild(el);
      this.rectElements.push(el);
    }

    for (let i = 0; i < rects.length; i++) {
      const r = rects[i];
      const el = this.rectElements[i];
      el.setAttribute('x', String(-r.width / 2));
      el.setAttribute('y', String(-r.height / 2));
      el.setAttribute('width', String(r.width));
      el.setAttribute('height', String(r.height));
      el.setAttribute('rx', String(r.cornerRadius));
      el.setAttribute('ry', String(r.cornerRadius));
      el.setAttribute('transform', `translate(${r.cx}, ${r.cy}) rotate(${r.rotation})`);
      el.setAttribute('stroke', r.stroke);
      el.setAttribute('stroke-width', String(r.strokeWidth));
      el.setAttribute('fill', r.gradientId ? `url(#${r.gradientId})` : r.fill);
      el.classList.add('blend-rect');
    }
  }

  private updateBackground(config: BlendConfig): void {
    if (config.backgroundMode === 'solid') {
      if (this.bgGradEl) {
        this.bgGradEl.remove();
        this.bgGradEl = null;
        this.bgStopEls = [];
      }
      this.bgRect.setAttribute('fill', config.bgGradient.stops[0].color);
      return;
    }

    const bg = config.bgGradient;
    const isLinear = config.backgroundMode === 'linear';

    // Reuse or create gradient element
    if (!this.bgGradEl || this.bgGradEl.tagName !== (isLinear ? 'linearGradient' : 'radialGradient')) {
      if (this.bgGradEl) this.bgGradEl.remove();
      this.bgStopEls = [];

      if (isLinear) {
        this.bgGradEl = document.createElementNS(SVG_NS, 'linearGradient');
      } else {
        this.bgGradEl = document.createElementNS(SVG_NS, 'radialGradient');
        this.bgGradEl.setAttribute('cx', '50%');
        this.bgGradEl.setAttribute('cy', '50%');
        this.bgGradEl.setAttribute('r', '70%');
      }
      this.bgGradEl.id = 'bg-gradient';

      for (let i = 0; i < STOPS_PER_GRAD; i++) {
        const stop = document.createElementNS(SVG_NS, 'stop');
        this.bgGradEl.appendChild(stop);
        this.bgStopEls.push(stop);
      }
      this.defs.appendChild(this.bgGradEl);
    }

    if (isLinear) {
      const rad = (bg.angle * Math.PI) / 180;
      this.bgGradEl.setAttribute('x1', String(0.5 - Math.cos(rad) * 0.5));
      this.bgGradEl.setAttribute('y1', String(0.5 - Math.sin(rad) * 0.5));
      this.bgGradEl.setAttribute('x2', String(0.5 + Math.cos(rad) * 0.5));
      this.bgGradEl.setAttribute('y2', String(0.5 + Math.sin(rad) * 0.5));
    }

    const { colors, positions } = expand5Stops(bg);
    for (let i = 0; i < STOPS_PER_GRAD; i++) {
      this.bgStopEls[i].setAttribute('offset', `${positions[i]}%`);
      this.bgStopEls[i].setAttribute('stop-color', colors[i]);
    }

    this.bgRect.setAttribute('fill', 'url(#bg-gradient)');
  }

  /**
   * Optimized gradient defs with 5-stop midpoint support.
   */
  private updateGradientDefs(rects: RectDescriptor[], config: BlendConfig): void {
    if (config.fillMode !== 'gradient') {
      this.gradCache.forEach(el => el.remove());
      this.gradCache.clear();
      return;
    }

    const gs = config.gradientStart;
    const ge = config.gradientEnd;
    const needed = new Set<string>();

    // Pre-expand both gradient configs
    const gsExp = expand5Stops(gs);
    const geExp = expand5Stops(ge);

    for (let i = 0; i < rects.length; i++) {
      const t = rects[i].blendT;
      const id = `rect-grad-${i}`;
      needed.add(id);

      const angle = lerp(gs.angle, ge.angle, t);
      const useType = t <= 0.5 ? gs.type : ge.type;
      const isLinear = useType === 'linear';

      let grad = this.gradCache.get(id);

      // Recreate if type changed
      if (grad && ((isLinear && grad.tagName !== 'linearGradient') || (!isLinear && grad.tagName !== 'radialGradient'))) {
        grad.remove();
        this.gradCache.delete(id);
        grad = undefined;
      }

      if (!grad) {
        if (isLinear) {
          grad = document.createElementNS(SVG_NS, 'linearGradient');
          grad.setAttribute('gradientUnits', 'objectBoundingBox');
        } else {
          grad = document.createElementNS(SVG_NS, 'radialGradient');
          grad.setAttribute('cx', '50%');
          grad.setAttribute('cy', '50%');
          grad.setAttribute('r', '50%');
          grad.setAttribute('gradientUnits', 'objectBoundingBox');
        }
        grad.id = id;
        for (let s = 0; s < STOPS_PER_GRAD; s++) {
          grad.appendChild(document.createElementNS(SVG_NS, 'stop'));
        }
        this.defs.appendChild(grad);
        this.gradCache.set(id, grad);
      }

      if (isLinear) {
        const rad = (angle * Math.PI) / 180;
        grad.setAttribute('x1', String(0.5 - Math.cos(rad) * 0.5));
        grad.setAttribute('y1', String(0.5 - Math.sin(rad) * 0.5));
        grad.setAttribute('x2', String(0.5 + Math.cos(rad) * 0.5));
        grad.setAttribute('y2', String(0.5 + Math.sin(rad) * 0.5));
      }

      // Interpolate all 5 stops between start and end expanded configs
      const stops = grad.querySelectorAll('stop');
      for (let s = 0; s < STOPS_PER_GRAD; s++) {
        const color = lerpColor(gsExp.colors[s], geExp.colors[s], t);
        const pos = lerp(gsExp.positions[s], geExp.positions[s], t);
        stops[s].setAttribute('offset', `${pos}%`);
        stops[s].setAttribute('stop-color', color);
      }

      rects[i].gradientId = id;
    }

    // Remove unused cached gradients
    for (const [id, el] of this.gradCache) {
      if (!needed.has(id)) {
        el.remove();
        this.gradCache.delete(id);
      }
    }
  }
}
