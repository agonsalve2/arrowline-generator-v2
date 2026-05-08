import type { BlendConfig, RectDescriptor, Point } from '../types';
import { evaluateBezier, evaluateBezierTangent, computeControlPoints } from './path';
import { lerp, clamp, radToDeg } from '../utils';

export function computePathEndpoints(config: BlendConfig, width: number, height: number): { start: Point; end: Point } {
  const margin = 0.1;
  switch (config.blendPosition) {
    case 'bottom-left':
      return {
        start: { x: width * margin, y: height * (1 - margin) },
        end: { x: width * (1 - margin), y: height * margin },
      };
    case 'top-right':
      return {
        start: { x: width * (1 - margin), y: height * margin },
        end: { x: width * margin, y: height * (1 - margin) },
      };
    case 'bottom-right':
      return {
        start: { x: width * (1 - margin), y: height * (1 - margin) },
        end: { x: width * margin, y: height * margin },
      };
    case 'top-left':
      return {
        start: { x: width * margin, y: height * margin },
        end: { x: width * (1 - margin), y: height * (1 - margin) },
      };
    case 'center':
      return {
        start: { x: width * 0.2, y: height * 0.5 },
        end: { x: width * 0.8, y: height * 0.5 },
      };
    default:
      return {
        start: { x: width * margin, y: height * (1 - margin) },
        end: { x: width * (1 - margin), y: height * margin },
      };
  }
}

export interface PathInfo {
  start: Point;
  end: Point;
  p1: Point;
  p2: Point;
}

export function computePath(config: BlendConfig, canvasWidth: number, canvasHeight: number): PathInfo {
  const { start, end } = computePathEndpoints(config, canvasWidth, canvasHeight);
  const { p1, p2 } = computeControlPoints(start, end, config.twist, config.twistDirection, config.curveMode);
  return { start, end, p1, p2 };
}

function rectAtT(t: number, config: BlendConfig, path: PathInfo): RectDescriptor {
  const { start, p1, p2, end } = path;

  const pos = evaluateBezier(t, start, p1, p2, end);
  const tangent = evaluateBezierTangent(t, start, p1, p2, end);
  const angle = radToDeg(Math.atan2(tangent.y, tangent.x));

  const sizeT = clamp(t, 0, 1);
  const w = lerp(config.minWidth, config.maxWidth, sizeT);
  const h = lerp(config.minHeight, config.maxHeight, sizeT);

  return {
    cx: pos.x,
    cy: pos.y,
    width: w,
    height: h,
    rotation: angle,
    cornerRadius: config.cornerRadius,
    stroke: config.strokeColor,
    strokeWidth: config.strokeWidth,
    fill: config.fillMode === 'solid' ? config.fillColor : 'none',
    blendT: sizeT,
    rawT: t,
  };
}

export function generateBlend(config: BlendConfig, canvasWidth: number, canvasHeight: number): RectDescriptor[] {
  const path = computePath(config, canvasWidth, canvasHeight);
  return generateBlendFromPath(config, path, 0);
}

export function generateBlendFromPath(
  config: BlendConfig,
  path: PathInfo,
  tOffset: number,
): RectDescriptor[] {
  const rects: RectDescriptor[] = [];
  const spacing = 1 / (config.count - 1);
  const bufferCount = 4;

  if (tOffset === 0) {
    // Static: generate with buffer for clipping at ends
    for (let i = -bufferCount; i < config.count + bufferCount; i++) {
      const t = i * spacing;
      rects.push(rectAtT(t, config, path));
    }
  } else {
    // Conveyor belt: wrap tOffset by spacing so pattern repeats seamlessly
    const wrappedOffset = ((tOffset % spacing) + spacing) % spacing;

    const startIdx = -bufferCount;
    const endIdx = config.count - 1 + bufferCount;

    for (let i = startIdx; i <= endIdx; i++) {
      const t = i * spacing + wrappedOffset;
      rects.push(rectAtT(t, config, path));
    }
  }

  // Sort by rawT for stable z-order along the path
  rects.sort((a, b) => a.rawT - b.rawT);

  // Apply z-order preference: 'large-front' renders large rects last (on top)
  if (config.zOrder === 'large-front') {
    rects.reverse();
  }

  return rects;
}
