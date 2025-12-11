import * as THREE from 'three';
import { VisualShape } from '../types';

// Helper to map 0..1 to range
const map = (val: number, min: number, max: number) => min + val * (max - min);

export const getShapePositions = (
  type: VisualShape,
  count: number,
  chaosLevel: number = 0.5
): Float32Array => {
  const positions = new Float32Array(count * 3);
  const dummy = new THREE.Vector3();

  // For attractors that need continuous integration
  let ax = 0.1, ay = 0, az = 0; 
  
  for (let i = 0; i < count; i++) {
    const idx = i * 3;
    const t = i / count; // Normalized index 0..1

    // Random factors based on chaos
    const r1 = Math.random();
    const r2 = Math.random();
    const r3 = Math.random();

    switch (type) {
      case VisualShape.SPHERE: {
        const theta = 2 * Math.PI * r1;
        const phi = Math.acos(2 * r2 - 1);
        const radius = 10 + (r3 * chaosLevel * 5);
        dummy.setFromSphericalCoords(radius, phi, theta);
        break;
      }

      case VisualShape.GALAXY_SPIRAL: {
        // Logarithmic spiral
        const arms = 3 + Math.floor(chaosLevel * 4);
        const spin = t * arms * Math.PI * 2;
        const distance = Math.pow(r1, 0.5) * 20; // Concentrate in center
        const armOffset = (Math.floor(r2 * arms) / arms) * Math.PI * 2;
        
        dummy.x = Math.cos(spin + armOffset) * distance;
        dummy.y = (r3 - 0.5) * (distance * 0.2); // Flat galaxy
        dummy.z = Math.sin(spin + armOffset) * distance;
        break;
      }

      case VisualShape.LORENZ_ATTRACTOR: {
        // Integrating Lorenz equations roughly
        // We use the continuous variables ax, ay, az initialized outside
        const dt = 0.005;
        const sigma = 10;
        const rho = 28;
        const beta = 8 / 3;
        
        // Restart trace occasionally to create lines
        if (i % 500 === 0) {
            ax = 0.1; ay = 0.1; az = 0.1;
            // Jump to random start
            ax += (Math.random()-0.5)*10;
        }

        const dx = sigma * (ay - ax) * dt;
        const dy = (ax * (rho - az) - ay) * dt;
        const dz = (ax * ay - beta * az) * dt;
        ax += dx;
        ay += dy;
        az += dz;
        
        dummy.set(ax, ay, az - 25);
        dummy.multiplyScalar(0.8);
        break;
      }

      case VisualShape.MOBIUS_STRIP: {
        const u = r1 * Math.PI * 2;
        const v = map(r2, -1, 1);
        const radius = 10;
        
        dummy.x = (radius + v/2 * Math.cos(u/2)) * Math.cos(u);
        dummy.y = (radius + v/2 * Math.cos(u/2)) * Math.sin(u);
        dummy.z = v/2 * Math.sin(u/2) * 5;
        break;
      }

      case VisualShape.CARDIOID_HEART: {
        const u = r1 * Math.PI; 
        const v = r2 * Math.PI * 2;
        const scale = 1.5;
        dummy.x = scale * 16 * Math.pow(Math.sin(v), 3) * Math.sin(u);
        dummy.y = scale * (13 * Math.cos(v) - 5 * Math.cos(2*v) - 2 * Math.cos(3*v) - Math.cos(4*v));
        dummy.z = scale * 16 * Math.pow(Math.sin(v), 3) * Math.cos(u);
        break;
      }

      case VisualShape.DNA_HELIX: {
         const turns = 5;
         const h = map(t, -15, 15);
         const angle = t * Math.PI * 2 * turns;
         const radius = 6;
         const strand = i % 2 === 0 ? 0 : Math.PI;
         dummy.x = Math.cos(angle + strand) * radius;
         dummy.z = Math.sin(angle + strand) * radius;
         dummy.y = h * 2;
         dummy.x += (r3 - 0.5) * chaosLevel * 2;
         dummy.z += (r3 - 0.5) * chaosLevel * 2;
         break;
      }
      
      case VisualShape.MENGER_SPONGE_APPROX: {
         const size = 20;
         const snap = (val: number) => {
             if (Math.random() > chaosLevel) {
                 const step = size / 3;
                 return Math.round(val / step) * step;
             }
             return val;
         }
         dummy.x = snap(map(r1, -size, size));
         dummy.y = snap(map(r2, -size, size));
         dummy.z = snap(map(r3, -size, size));
         break;
      }

      case VisualShape.PENROSE_TRIANGLE_APPROX: {
          const leg = i % 3;
          const pos = map(Math.random(), -10, 10);
          const thickness = 2 + chaosLevel;
          if (leg === 0) { 
             dummy.set(pos, -10, 0);
             dummy.z += (Math.random() - 0.5) * thickness;
             dummy.y += (Math.random() - 0.5) * thickness;
          } else if (leg === 1) { 
             dummy.set(10 - (pos+10)/2, -10 + (pos+10)*0.866, 0); 
             dummy.z += (Math.random() - 0.5) * thickness;
          } else { 
             dummy.set(-10 + (pos+10)/2, -10 + (pos+10)*0.866, 0);
             dummy.z += (Math.random() - 0.5) * thickness; 
          }
          break;
      }

      case VisualShape.TORUS: {
        const R = 15; 
        const r = 5 + chaosLevel * 3; 
        const u = r1 * Math.PI * 2;
        const v = r2 * Math.PI * 2;
        dummy.x = (R + r * Math.cos(v)) * Math.cos(u);
        dummy.y = (R + r * Math.cos(v)) * Math.sin(u);
        dummy.z = r * Math.sin(v);
        break;
      }

      case VisualShape.KLEIN_BOTTLE: {
        const u = r1 * Math.PI * 2;
        const v = r2 * Math.PI * 2;
        const r_tube = 6;
        const cU2 = Math.cos(u/2);
        const sU2 = Math.sin(u/2);
        const sV = Math.sin(v);
        const s2V = Math.sin(2*v);
        const temp = r_tube + cU2 * sV - sU2 * s2V;
        dummy.x = temp * Math.cos(u);
        dummy.z = temp * Math.sin(u);
        dummy.y = sU2 * sV + cU2 * s2V;
        dummy.multiplyScalar(2.0);
        break;
      }

      case VisualShape.VOXEL_GRID: {
        const size = 25;
        const steps = 6;
        const stepSize = (size * 2) / steps;
        const snap = (v: number) => Math.round(v / stepSize) * stepSize;
        dummy.x = snap(map(r1, -size, size));
        dummy.y = snap(map(r2, -size, size));
        dummy.z = snap(map(r3, -size, size));
        dummy.x += (Math.random() - 0.5) * chaosLevel * 2;
        dummy.y += (Math.random() - 0.5) * chaosLevel * 2;
        dummy.z += (Math.random() - 0.5) * chaosLevel * 2;
        break;
      }

      case VisualShape.CYBER_FLOWER: {
        const theta = r1 * Math.PI * 2; 
        const phi = r2 * Math.PI; 
        const k = 4 + Math.floor(chaosLevel * 3); 
        const rBase = 15;
        const rVar = 10 * Math.sin(k * theta) * Math.sin(k * phi);
        const r = rBase + rVar;
        dummy.setFromSphericalCoords(r, phi, theta);
        if (i % 10 === 0) dummy.multiplyScalar(0.2); 
        break;
      }

      case VisualShape.LIQUID_WAVE: {
        const size = 40;
        const cols = Math.floor(Math.sqrt(count));
        const row = Math.floor(i / cols);
        const col = i % cols;
        const x = map(col / cols, -size, size);
        const z = map(row / cols, -size, size);
        dummy.set(x, 0, z);
        dummy.x += (Math.random() - 0.5) * 2;
        dummy.z += (Math.random() - 0.5) * 2;
        break;
      }

      case VisualShape.PULSING_BLACK_HOLE: {
        if (i < count * 0.2) {
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 5 + Math.random();
            dummy.setFromSphericalCoords(r, phi, theta);
        } else {
            const angle = r1 * Math.PI * 2;
            const dist = 8 + (r2 * 25); 
            const heightVar = (1.0 / dist) * 10.0;
            dummy.x = Math.cos(angle) * dist;
            dummy.z = Math.sin(angle) * dist;
            dummy.y = (Math.random() - 0.5) * heightVar;
            const twist = dist * 0.2;
            const tx = dummy.x * Math.cos(twist) - dummy.z * Math.sin(twist);
            const tz = dummy.x * Math.sin(twist) + dummy.z * Math.cos(twist);
            dummy.x = tx;
            dummy.z = tz;
        }
        break;
      }
      
      case VisualShape.AIZAWA_ATTRACTOR: {
        // Aizawa parameters
        const dt = 0.01;
        const a = 0.95, b = 0.7, c = 0.6, d = 3.5, e = 0.25, f = 0.1;
        
        // Restart trace occasionally
        if (i % 500 === 0) {
            ax = 0.1; ay = 0; az = 0;
            ax += (Math.random()-0.5) * 2;
        }
        
        const dx = (az - b) * ax - d * ay;
        const dy = d * ax + (az - b) * ay;
        const dz = c + a * az - (Math.pow(az, 3) / 3) - (Math.pow(ax, 2) + Math.pow(ay, 2)) * (1 + e * az) + f * az * Math.pow(ax, 3);
        
        ax += dx * dt;
        ay += dy * dt;
        az += dz * dt;
        
        dummy.set(ax * 15, ay * 15, az * 15);
        break;
      }
      
      case VisualShape.THOMAS_ATTRACTOR: {
        // Thomas Cyclically Symmetric Attractor
        const b_const = 0.208186;
        const dt = 0.05; 
        
        if (i % 1000 === 0) {
            ax = 0.1; ay = 0.1; az = 0.1;
            ax += (Math.random() - 0.5) * 2;
        }
        
        const dx = Math.sin(ay) - b_const * ax;
        const dy = Math.sin(az) - b_const * ay;
        const dz = Math.sin(ax) - b_const * az;
        
        ax += dx * dt;
        ay += dy * dt;
        az += dz * dt;
        
        dummy.set(ax * 4, ay * 4, az * 4);
        dummy.multiplyScalar(8.0);
        break;
      }
      
      case VisualShape.CLIFFORD_ATTRACTOR: {
         // Using 3D Halvorsen actually, as Clifford is 2D map. 
         // Halvorsen is continuous and nice.
         const a_const = 1.4;
         const dt = 0.005;
         
         if (i % 500 === 0) {
            ax = 1; ay = 0; az = 0;
            ax += (Math.random() - 0.5);
         }
         
         const dx = -a_const * ax - 4 * ay - 4 * az - ay * ay;
         const dy = -a_const * ay - 4 * az - 4 * ax - az * az;
         const dz = -a_const * az - 4 * ax - 4 * ay - ax * ax;
         
         ax += dx * dt;
         ay += dy * dt;
         az += dz * dt;
         
         dummy.set(ax, ay, az);
         dummy.multiplyScalar(6.0);
         break;
      }

      default: {
         const s = 15;
         dummy.x = map(r1, -s, s);
         dummy.y = map(r2, -s, s);
         dummy.z = map(r3, -s, s);
      }
    }

    positions[idx] = dummy.x;
    positions[idx + 1] = dummy.y;
    positions[idx + 2] = dummy.z;
  }

  return positions;
};