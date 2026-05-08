import type { BlendConfig } from '../types';
import { computePath, generateBlendFromPath } from '../engine/blend';
import { BlendRenderer } from '../engine/renderer';
import { lerpColor } from '../utils';

function expand5Stops(cfg: { stops: { color: string; position: number }[]; midpoints?: [number, number] }): { colors: string[]; positions: number[] } {
  const mid = cfg.midpoints ?? [0.5, 0.5];
  const c = cfg.stops.map(s => s.color);
  const p = cfg.stops.map(s => s.position);
  return {
    colors: [c[0], lerpColor(c[0], c[1], 0.5), c[1], lerpColor(c[1], c[2], 0.5), c[2]],
    positions: [p[0], p[0] + mid[0] * (p[1] - p[0]), p[1], p[1] + mid[1] * (p[2] - p[1]), p[2]],
  };
}

export function exportAnimatedHtml(svg: SVGSVGElement, config: BlendConfig, filename: string = 'blend-animated.html'): void {
  const width = config.canvasWidth;
  const height = config.canvasHeight;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  clone.removeAttribute('style');

  const serializer = new XMLSerializer();
  const svgMarkup = serializer.serializeToString(clone);

  // Compute path at export time
  const path = computePath(config, width, height);

  // Pre-expand gradient configs for embedding
  const gsExp = expand5Stops(config.gradientStart);
  const geExp = expand5Stops(config.gradientEnd);

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Blend Animation</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #000; }
  svg { max-width: 100vw; max-height: 100vh; }
</style>
</head>
<body>
${svgMarkup}
<script>
(function() {
  // --- Embedded config ---
  var P0 = {x:${path.start.x},y:${path.start.y}};
  var P1 = {x:${path.p1.x},y:${path.p1.y}};
  var P2 = {x:${path.p2.x},y:${path.p2.y}};
  var P3 = {x:${path.end.x},y:${path.end.y}};
  var COUNT = ${config.count};
  var MIN_W = ${config.minWidth}, MAX_W = ${config.maxWidth};
  var MIN_H = ${config.minHeight}, MAX_H = ${config.maxHeight};
  var CORNER_R = ${config.cornerRadius};
  var STROKE = '${config.strokeColor}', STROKE_W = ${config.strokeWidth};
  var FILL_MODE = '${config.fillMode}';
  var FILL_COLOR = '${config.fillColor}';
  var Z_ORDER = '${config.zOrder}';
  var SPEED = ${config.marchSpeed};
  var BUFFER = 4;

  // Gradient stop data (pre-expanded 5 stops)
  var GS_COLORS = ${JSON.stringify(gsExp.colors)};
  var GS_POS = ${JSON.stringify(gsExp.positions)};
  var GE_COLORS = ${JSON.stringify(geExp.colors)};
  var GE_POS = ${JSON.stringify(geExp.positions)};

  // --- Math helpers ---
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, lo, hi) { return Math.min(Math.max(v, lo), hi); }

  function bezier(t, p0, p1, p2, p3) {
    var mt = 1 - t, mt2 = mt * mt, mt3 = mt2 * mt;
    var t2 = t * t, t3 = t2 * t;
    return {
      x: mt3*p0.x + 3*mt2*t*p1.x + 3*mt*t2*p2.x + t3*p3.x,
      y: mt3*p0.y + 3*mt2*t*p1.y + 3*mt*t2*p2.y + t3*p3.y
    };
  }

  function tangent(t, p0, p1, p2, p3) {
    var mt = 1 - t, mt2 = mt * mt, t2 = t * t;
    return {
      x: 3*mt2*(p1.x-p0.x) + 6*mt*t*(p2.x-p1.x) + 3*t2*(p3.x-p2.x),
      y: 3*mt2*(p1.y-p0.y) + 6*mt*t*(p2.y-p1.y) + 3*t2*(p3.y-p2.y)
    };
  }

  function hexToRgb(hex) {
    var h = hex.replace('#', '');
    return [parseInt(h.substring(0,2),16), parseInt(h.substring(2,4),16), parseInt(h.substring(4,6),16)];
  }

  function rgbToHex(r, g, b) {
    function th(n) { return Math.round(Math.min(255, Math.max(0, n))).toString(16).padStart(2, '0'); }
    return '#' + th(r) + th(g) + th(b);
  }

  function lerpColor(h1, h2, t) {
    var c1 = hexToRgb(h1), c2 = hexToRgb(h2);
    return rgbToHex(lerp(c1[0],c2[0],t), lerp(c1[1],c2[1],t), lerp(c1[2],c2[2],t));
  }

  // --- Setup ---
  var rects = Array.from(document.querySelectorAll('.blend-rect'));
  var totalRects = (COUNT - 1) + 2 * BUFFER + 1; // startIdx..-BUFFER to endIdx..COUNT-1+BUFFER
  var spacing = 1 / (COUNT - 1);
  var tOffset = 0;
  var lastTime = 0;

  // Ensure we have exactly the right number of rect elements
  // (the exported SVG should already have them from the static render)

  function frame(now) {
    if (!lastTime) { lastTime = now; requestAnimationFrame(frame); return; }
    var dt = now - lastTime;
    lastTime = now;

    tOffset += (spacing * SPEED / 1000) * dt;
    // Prevent drift
    if (tOffset > spacing * 1000) tOffset = tOffset % spacing;

    var wrappedOffset = ((tOffset % spacing) + spacing) % spacing;
    var startIdx = -BUFFER;
    var endIdx = COUNT - 1 + BUFFER;

    // Generate descriptors
    var descs = [];
    for (var i = startIdx; i <= endIdx; i++) {
      var t = i * spacing + wrappedOffset;
      var pos = bezier(t, P0, P1, P2, P3);
      var tan = tangent(t, P0, P1, P2, P3);
      var angle = Math.atan2(tan.y, tan.x) * 180 / Math.PI;
      var sizeT = clamp(t, 0, 1);
      var w = lerp(MIN_W, MAX_W, sizeT);
      var h = lerp(MIN_H, MAX_H, sizeT);
      descs.push({ rawT: t, sizeT: sizeT, cx: pos.x, cy: pos.y, w: w, h: h, angle: angle });
    }

    // Sort by rawT for z-order
    descs.sort(function(a, b) { return a.rawT - b.rawT; });
    if (Z_ORDER === 'large-front') descs.reverse();

    // Update rect DOM elements
    var n = Math.min(rects.length, descs.length);
    for (var j = 0; j < n; j++) {
      var d = descs[j];
      var el = rects[j];
      el.setAttribute('x', String(-d.w / 2));
      el.setAttribute('y', String(-d.h / 2));
      el.setAttribute('width', String(d.w));
      el.setAttribute('height', String(d.h));
      el.setAttribute('rx', String(CORNER_R));
      el.setAttribute('ry', String(CORNER_R));
      el.setAttribute('transform', 'translate(' + d.cx + ', ' + d.cy + ') rotate(' + d.angle + ')');
      el.setAttribute('stroke', STROKE);
      el.setAttribute('stroke-width', String(STROKE_W));

      // Update fill
      if (FILL_MODE === 'gradient') {
        var grad = document.getElementById('rect-grad-' + j);
        if (grad) {
          el.setAttribute('fill', 'url(#rect-grad-' + j + ')');
          var stops = grad.querySelectorAll('stop');
          for (var s = 0; s < 5 && s < stops.length; s++) {
            var color = lerpColor(GS_COLORS[s], GE_COLORS[s], d.sizeT);
            var gpos = lerp(GS_POS[s], GE_POS[s], d.sizeT);
            stops[s].setAttribute('offset', gpos + '%');
            stops[s].setAttribute('stop-color', color);
          }
        }
      } else if (FILL_MODE === 'solid') {
        el.setAttribute('fill', FILL_COLOR);
      } else {
        el.setAttribute('fill', 'none');
      }
    }

    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
})();
<\/script>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

let marchRafId = 0;

export function stopMarchAnimation(): void {
  if (marchRafId) {
    cancelAnimationFrame(marchRafId);
    marchRafId = 0;
  }
}

export function startMarchAnimation(
  renderer: BlendRenderer,
  config: BlendConfig,
): void {
  stopMarchAnimation();

  let tOffset = 0;
  let lastTime = 0;

  function marchFrame(timestamp: number) {
    if (!lastTime) lastTime = timestamp;
    const dt = timestamp - lastTime;
    lastTime = timestamp;

    const spacing = 1 / (config.count - 1);
    tOffset += (spacing * config.marchSpeed / 1000) * dt;

    // Prevent floating-point drift over long runs (handles both signs)
    if (Math.abs(tOffset) > spacing * 1000) {
      tOffset = ((tOffset % spacing) + spacing) % spacing;
    }

    // Recompute path each frame so live path changes take effect immediately
    const path = computePath(config, config.canvasWidth, config.canvasHeight);
    const rects = generateBlendFromPath(config, path, tOffset);
    renderer.render(rects, config);

    marchRafId = requestAnimationFrame(marchFrame);
  }

  marchRafId = requestAnimationFrame(marchFrame);
}
