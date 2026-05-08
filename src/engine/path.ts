import type { Point, CurveMode } from '../types';

export function evaluateBezier(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const mt3 = mt2 * mt;
  const t2 = t * t;
  const t3 = t2 * t;
  return {
    x: mt3 * p0.x + 3 * mt2 * t * p1.x + 3 * mt * t2 * p2.x + t3 * p3.x,
    y: mt3 * p0.y + 3 * mt2 * t * p1.y + 3 * mt * t2 * p2.y + t3 * p3.y,
  };
}

export function evaluateBezierTangent(t: number, p0: Point, p1: Point, p2: Point, p3: Point): Point {
  const mt = 1 - t;
  const mt2 = mt * mt;
  const t2 = t * t;
  return {
    x: 3 * mt2 * (p1.x - p0.x) + 6 * mt * t * (p2.x - p1.x) + 3 * t2 * (p3.x - p2.x),
    y: 3 * mt2 * (p1.y - p0.y) + 6 * mt * t * (p2.y - p1.y) + 3 * t2 * (p3.y - p2.y),
  };
}

export function computeControlPoints(
  start: Point,
  end: Point,
  twist: number,
  direction: 1 | -1,
  mode: CurveMode,
): { p1: Point; p2: Point } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const len = Math.sqrt(dx * dx + dy * dy);

  // Perpendicular unit vector
  const px = -dy / len;
  const py = dx / len;

  // Displacement magnitude (scales with path length)
  const displacement = twist * len * 0.5;

  if (mode === 'arc') {
    // Both control points displaced in the same direction
    return {
      p1: {
        x: start.x + dx / 3 + px * displacement * direction,
        y: start.y + dy / 3 + py * displacement * direction,
      },
      p2: {
        x: start.x + (2 * dx) / 3 + px * displacement * direction,
        y: start.y + (2 * dy) / 3 + py * displacement * direction,
      },
    };
  } else {
    // S-curve: control points displaced in opposite directions
    return {
      p1: {
        x: start.x + dx / 3 + px * displacement * direction,
        y: start.y + dy / 3 + py * displacement * direction,
      },
      p2: {
        x: start.x + (2 * dx) / 3 - px * displacement * direction,
        y: start.y + (2 * dy) / 3 - py * displacement * direction,
      },
    };
  }
}
