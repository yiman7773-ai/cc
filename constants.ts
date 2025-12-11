import { VisualShape } from './types';

export const PARTICLE_COUNT = 40000; // Increased max capacity for "High" setting
export const ANALYSER_FFT_SIZE = 512; // Must be power of 2

export const DEFAULT_VISUAL_CONFIG = {
  shape: VisualShape.SPHERE,
  colors: ['#ffffff', '#88ccff', '#ff00aa'] as [string, string, string],
  speed: 1.0,
  chaos: 0.5,
  description: "Waiting for music..."
};

export const DEFAULT_VISUAL_SETTINGS = {
  particleCount: 15000,
  particleSize: 1.0,
  brightness: 1.0,
  bloomIntensity: 1.5,
  trailStrength: 0.5, // Controls warp/flow
};

export const SHAPE_LABELS: Record<VisualShape, string> = {
  [VisualShape.SPHERE]: "Cosmic Sphere",
  [VisualShape.GALAXY_SPIRAL]: "Andromeda Spiral",
  [VisualShape.LORENZ_ATTRACTOR]: "Lorenz Chaos",
  [VisualShape.MOBIUS_STRIP]: "Infinity Loop",
  [VisualShape.MENGER_SPONGE_APPROX]: "Quantum Fractal",
  [VisualShape.PENROSE_TRIANGLE_APPROX]: "Impossible Triangle",
  [VisualShape.CARDIOID_HEART]: "Heartbeat",
  [VisualShape.DNA_HELIX]: "Life Helix",
  [VisualShape.CUBE_GRID]: "Matrix Grid",
  [VisualShape.TORUS]: "Flux Torus",
  [VisualShape.KLEIN_BOTTLE]: "Klein Manifold",
  [VisualShape.VOXEL_GRID]: "Digital Voxel",
  [VisualShape.CYBER_FLOWER]: "Neon Lotus",
  [VisualShape.LIQUID_WAVE]: "Sonic Rain",
  [VisualShape.PULSING_BLACK_HOLE]: "Event Horizon",
  [VisualShape.AIZAWA_ATTRACTOR]: "Aizawa Nebula",
  [VisualShape.THOMAS_ATTRACTOR]: "Thomas Cycler",
  [VisualShape.CLIFFORD_ATTRACTOR]: "Clifford Field",
  
  [VisualShape.KOCH_SNOWFLAKE]: "Koch Fractal",
  [VisualShape.ASTROID_ELLIPSOID]: "Hyper Star",
  [VisualShape.BUTTERFLY_CURVE]: "Chaos Butterfly",
  [VisualShape.ARCHIMEDEAN_SPIRAL]: "Golden Spiral",
  [VisualShape.CATENARY_SURFACE]: "Catenoid Tube",
  [VisualShape.BERNOULLI_LEMNISCATE]: "Infinity Ribbon"
};