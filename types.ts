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
  PULSING_BLACK_HOLE = 'PULSING_BLACK_HOLE'
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

export interface AudioData {
  frequencyData: Uint8Array;
  averageFrequency: number;
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