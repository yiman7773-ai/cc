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
        let x = 0.1, y = 0, z = 0;
        // Seed differently for trails
        const dt = 0.005;
        const sigma = 10;
        const rho = 28;
        const beta = 8 / 3;
        
        // Fast forward random amount
        const steps = 100 + i % 2000;
        
        for(let s=0; s<steps; s++) {
             const dx = sigma * (y - x) * dt;
             const dy = (x * (rho - z) - y) * dt;
             const dz = (x * y - beta * z) * dt;
             x += dx;
             y += dy;
             z += dz;
        }
        dummy.set(x, y, z - 25); // Center it roughly
        dummy.multiplyScalar(0.8);
        break;
      }

      case VisualShape.MOBIUS_STRIP: {
        const u = r1 * Math.PI * 2;
        const v = map(r2, -1, 1);
        const radius = 10;
        
        dummy.x = (radius + v/2 * Math.cos(u/2)) * Math.cos(u);
        dummy.y = (radius + v/2 * Math.cos(u/2)) * Math.sin(u);
        dummy.z = v/2 * Math.sin(u/2) * 5; // Scale Z for visibility
        break;
      }

      case VisualShape.CARDIOID_HEART: {
        // 3D Heart approximation
        const u = r1 * Math.PI; // 0 to PI
        const v = r2 * Math.PI * 2; // 0 to 2PI
        const scale = 1.5;

        // Parametric equation for a heart
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
         
         // Two strands
         const strand = i % 2 === 0 ? 0 : Math.PI;
         
         dummy.x = Math.cos(angle + strand) * radius;
         dummy.z = Math.sin(angle + strand) * radius;
         dummy.y = h * 2;
         
         // Add noise
         dummy.x += (r3 - 0.5) * chaosLevel * 2;
         dummy.z += (r3 - 0.5) * chaosLevel * 2;
         break;
      }
      
      case VisualShape.MENGER_SPONGE_APPROX: {
         // Random point in a cube, but filtered roughly to look "boxy"
         const size = 20;
         // Bias towards edges/corners for fractal look
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
          // Hard to do real penrose in 3D, simulate a triangle frame
          const leg = i % 3;
          const pos = map(Math.random(), -10, 10);
          const thickness = 2 + chaosLevel;
          
          if (leg === 0) { // Bottom
             dummy.set(pos, -10, 0);
             dummy.z += (Math.random() - 0.5) * thickness;
             dummy.y += (Math.random() - 0.5) * thickness;
          } else if (leg === 1) { // Right diagonal
             dummy.set(10 - (pos+10)/2, -10 + (pos+10)*0.866, 0); 
             // 0.866 is sin(60)
             dummy.z += (Math.random() - 0.5) * thickness;
          } else { // Left diagonal
             dummy.set(-10 + (pos+10)/2, -10 + (pos+10)*0.866, 0);
             dummy.z += (Math.random() - 0.5) * thickness; 
          }
          break;
      }

      case VisualShape.TORUS: {
        const R = 15; // Major radius
        const r = 5 + chaosLevel * 3; // Minor radius
        const u = r1 * Math.PI * 2;
        const v = r2 * Math.PI * 2;
        
        dummy.x = (R + r * Math.cos(v)) * Math.cos(u);
        dummy.y = (R + r * Math.cos(v)) * Math.sin(u);
        dummy.z = r * Math.sin(v);
        break;
      }

      case VisualShape.KLEIN_BOTTLE: {
        // Figure-8 Klein Bottle immersion
        const u = r1 * Math.PI * 2;
        const v = r2 * Math.PI * 2;
        const r_tube = 6;
        
        // Base formulas
        const cU2 = Math.cos(u/2);
        const sU2 = Math.sin(u/2);
        const sV = Math.sin(v);
        const s2V = Math.sin(2*v);
        
        const temp = r_tube + cU2 * sV - sU2 * s2V;
        
        dummy.x = temp * Math.cos(u);
        dummy.z = temp * Math.sin(u);
        dummy.y = sU2 * sV + cU2 * s2V;
        
        dummy.multiplyScalar(2.0); // Scale up
        break;
      }

      case VisualShape.VOXEL_GRID: {
        const size = 25;
        const steps = 6; // Grid density
        const stepSize = (size * 2) / steps;
        
        const snap = (v: number) => Math.round(v / stepSize) * stepSize;
        
        dummy.x = snap(map(r1, -size, size));
        dummy.y = snap(map(r2, -size, size));
        dummy.z = snap(map(r3, -size, size));
        
        // Add slight jitter based on chaos
        dummy.x += (Math.random() - 0.5) * chaosLevel * 2;
        dummy.y += (Math.random() - 0.5) * chaosLevel * 2;
        dummy.z += (Math.random() - 0.5) * chaosLevel * 2;
        break;
      }

      case VisualShape.CYBER_FLOWER: {
        // Parametric Rose / Harmonic sphere
        // r = sin(k * theta) + ...
        const theta = r1 * Math.PI * 2; // Azimuth
        const phi = r2 * Math.PI; // Elevation
        
        // k determines number of petals
        const k = 4 + Math.floor(chaosLevel * 3); 
        
        // Modulate radius based on angles to create petals
        const rBase = 15;
        const rVar = 10 * Math.sin(k * theta) * Math.sin(k * phi);
        const r = rBase + rVar;
        
        dummy.setFromSphericalCoords(r, phi, theta);
        
        // Add a "stamen" or core effect
        if (i % 10 === 0) {
             dummy.multiplyScalar(0.2); // Core particles
        }
        break;
      }

      case VisualShape.LIQUID_WAVE: {
        // Grid on XZ plane
        const size = 40;
        const cols = Math.floor(Math.sqrt(count));
        const row = Math.floor(i / cols);
        const col = i % cols;
        
        const x = map(col / cols, -size, size);
        const z = map(row / cols, -size, size);
        
        // Base flat plane, shader will animate Y
        dummy.set(x, 0, z);
        
        // Add random scatter to make it less grid-like, more like liquid particles
        dummy.x += (Math.random() - 0.5) * 2;
        dummy.z += (Math.random() - 0.5) * 2;
        break;
      }

      case VisualShape.PULSING_BLACK_HOLE: {
        // Accretion Disk + Sphere
        if (i < count * 0.2) {
            // Core Sphere (Event Horizon)
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);
            const r = 5 + Math.random();
            dummy.setFromSphericalCoords(r, phi, theta);
        } else {
            // Accretion Disk
            const angle = r1 * Math.PI * 2;
            const dist = 8 + (r2 * 25); // 8 to 33
            const heightVar = (1.0 / dist) * 10.0; // Thinner at edges
            
            dummy.x = Math.cos(angle) * dist;
            dummy.z = Math.sin(angle) * dist;
            dummy.y = (Math.random() - 0.5) * heightVar;
            
            // Spiral arms twist
            const twist = dist * 0.2;
            const tx = dummy.x * Math.cos(twist) - dummy.z * Math.sin(twist);
            const tz = dummy.x * Math.sin(twist) + dummy.z * Math.cos(twist);
            dummy.x = tx;
            dummy.z = tz;
        }
        break;
      }

      default: {
         // Fallback
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