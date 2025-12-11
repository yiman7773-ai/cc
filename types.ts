import React from 'react';

export enum VisualShape {
  SPHERE = 'SPHERE',
  GALAXY_SPIRAL = 'GALAXY_SPIRAL',
  LORENZ_ATTRACTOR = 'LORENZ_ATTRACTOR',
  MOBIUS_STRIP = 'MOBIUS_STRIP',
  MENGER_SPONGE_APPROX = 'MENGER_SPONGE_APPROX',
  PENROSE_TRIANGLE_APPROX = 'PENROSE_TRIANGLE_APPROX',
  CARDIOID_HEART = 'CARDIOID_HEART',
  DNA_HELIX = 'DNA_HELIX',
  CUBE_GRID = 'CUBE_GRID',
  TORUS = 'TORUS',
  KLEIN_BOTTLE = 'KLEIN_BOTTLE',
  VOXEL_GRID = 'VOXEL_GRID',
  CYBER_FLOWER = 'CYBER_FLOWER',
  LIQUID_WAVE = 'LIQUID_WAVE',
  PULSING_BLACK_HOLE = 'PULSING_BLACK_HOLE',
  AIZAWA_ATTRACTOR = 'AIZAWA_ATTRACTOR',
  THOMAS_ATTRACTOR = 'THOMAS_ATTRACTOR',
  CLIFFORD_ATTRACTOR = 'CLIFFORD_ATTRACTOR',
  
  // New Mathematical Shapes
  KOCH_SNOWFLAKE = 'KOCH_SNOWFLAKE',
  ASTROID_ELLIPSOID = 'ASTROID_ELLIPSOID',
  BUTTERFLY_CURVE = 'BUTTERFLY_CURVE',
  ARCHIMEDEAN_SPIRAL = 'ARCHIMEDEAN_SPIRAL',
  CATENARY_SURFACE = 'CATENARY_SURFACE',
  BERNOULLI_LEMNISCATE = 'BERNOULLI_LEMNISCATE'
}

export interface SongMetadata {
  id: string;
  file: File;
  name: string;
  artist?: string;
  duration: number;
}

export interface VisualConfig {
  shape: VisualShape;
  colors: [string, string, string]; // Primary, Secondary, Highlight
  speed: number;
  chaos: number;
  description: string;
}

export interface VisualSettings {
  particleCount: number;
  particleSize: number;
  brightness: number;
  bloomIntensity: number;
  trailStrength: number;
}

export interface AudioData {
  frequencyData: Uint8Array;
  averageFrequency: number;
}

export interface GestureState {
  leftHand: {
    active: boolean;
    isFist: boolean; // true = contract, false = explode
    strength: number; // 0.0 to 1.0 (grip strength or openness)
  };
  rightHand: {
    active: boolean;
    x: number; // Normalized -1 to 1 (screen space mapped to 3D)
    y: number; // Normalized -1 to 1
    gesture: 'NONE' | 'TOUCH' | 'RAIN';
  };
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      // HTML Elements
      div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
      span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
      p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
      h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
      button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
      input: React.DetailedHTMLProps<React.InputHTMLAttributes<HTMLInputElement>, HTMLInputElement>;
      video: React.DetailedHTMLProps<React.VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>;
      label: React.DetailedHTMLProps<React.LabelHTMLAttributes<HTMLLabelElement>, HTMLLabelElement>;
      
      // React Three Fiber Elements
      points: any;
      bufferGeometry: any;
      bufferAttribute: any;
      color: any;
      fog: any;
      starMaterial: any;
      backgroundStarMaterial: any;
    }
  }
}