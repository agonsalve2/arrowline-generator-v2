export interface Point {
  x: number;
  y: number;
}

export type CurveMode = 'arc' | 's-curve';
export type GradientType = 'linear' | 'radial';
export type FillMode = 'none' | 'solid' | 'gradient';
export type BackgroundMode = 'solid' | 'linear' | 'radial';
export type AnimationType = 'none' | 'march';
export type ZOrder = 'small-front' | 'large-front';
export type BlendPosition = 'bottom-left' | 'center' | 'top-right' | 'bottom-right' | 'top-left';

export interface GradientStop {
  color: string;
  position: number; // 0..100
}

export interface GradientConfig {
  type: GradientType;
  stops: [GradientStop, GradientStop, GradientStop]; // 3 stops
  midpoints: [number, number]; // 0..1 each, blend midpoint between adjacent stops
  angle: number; // degrees, for linear
}

export interface BlendConfig {
  // Canvas
  canvasWidth: number;
  canvasHeight: number;

  // Path
  twist: number;           // 0..1
  twistDirection: 1 | -1;
  curveMode: CurveMode;

  // Rectangles
  count: number;
  minWidth: number;
  minHeight: number;
  maxWidth: number;
  maxHeight: number;
  cornerRadius: number;
  strokeWidth: number;
  strokeColor: string;
  zOrder: ZOrder;
  blendPosition: BlendPosition;

  // Fill
  fillMode: FillMode;
  fillColor: string;
  gradientStart: GradientConfig;
  gradientEnd: GradientConfig;

  // Background
  backgroundMode: BackgroundMode;
  bgGradient: GradientConfig;

  // Animation
  animationType: AnimationType;
  marchSpeed: number; // 0.1..0.8, multiplier
}

export interface RectDescriptor {
  cx: number;
  cy: number;
  width: number;
  height: number;
  rotation: number; // degrees
  cornerRadius: number;
  stroke: string;
  strokeWidth: number;
  fill: string;
  gradientId?: string;
  blendT: number; // 0..1 position in the blend (for gradient interpolation)
  rawT: number; // unclamped t, for z-order sorting
}

export type PresetStyle = Pick<BlendConfig,
  | 'cornerRadius'
  | 'strokeWidth'
  | 'strokeColor'
  | 'zOrder'
  | 'fillMode'
  | 'fillColor'
  | 'gradientStart'
  | 'gradientEnd'
  | 'backgroundMode'
  | 'bgGradient'
  | 'marchSpeed'
>;

export const DEFAULT_CONFIG: BlendConfig = {
  canvasWidth: 1920,
  canvasHeight: 1080,

  twist: 0.5,
  twistDirection: 1,
  curveMode: 'arc',

  count: 12,
  minWidth: 28,
  minHeight: 105,
  maxWidth: 106,
  maxHeight: 526,
  cornerRadius: 15,
  strokeWidth: 1,
  strokeColor: '#ffffff',
  zOrder: 'small-front',
  blendPosition: 'bottom-left',

  fillMode: 'none',
  fillColor: '#ffffff',
  gradientStart: {
    type: 'linear',
    stops: [
      { color: '#ff0000', position: 0 },
      { color: '#ff8800', position: 50 },
      { color: '#ffff00', position: 100 },
    ],
    midpoints: [0.5, 0.5],
    angle: 0,
  },
  gradientEnd: {
    type: 'linear',
    stops: [
      { color: '#0088ff', position: 0 },
      { color: '#00ffaa', position: 50 },
      { color: '#00ff00', position: 100 },
    ],
    midpoints: [0.5, 0.5],
    angle: 0,
  },

  backgroundMode: 'solid',
  bgGradient: {
    type: 'linear',
    stops: [
      { color: '#000000', position: 0 },
      { color: '#1a1a2e', position: 50 },
      { color: '#333333', position: 100 },
    ],
    midpoints: [0.5, 0.5],
    angle: 0,
  },

  animationType: 'none',
  marchSpeed: 0.4,
};
