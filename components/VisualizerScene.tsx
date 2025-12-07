import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, extend } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { VisualShape, VisualConfig, AudioData } from '../types';
import { getShapePositions } from '../utils/mathShapes';
import { PARTICLE_COUNT } from '../constants';

// --- MAIN SHAPE SHADER ---
class StarMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#ffffff') },
        uColor2: { value: new THREE.Color('#88ccff') },
        uColor3: { value: new THREE.Color('#ff00aa') },
        uBeat: { value: 0 },
        uTreble: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSize: { value: 3.0 },
        uShapeMode: { value: 0.0 } // 0: Default, 1: Ripple, 2: Flower, 3: Pulse
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBeat;
        uniform float uTreble;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uShapeMode; // Controls special animations
        
        attribute float aScale;
        attribute vec3 aColorMix;
        attribute float aFlashSpeed;
        varying vec3 vColor;
        
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;

        void main() {
          vec3 pos = position;
          
          // --- SHAPE SPECIFIC ANIMATIONS ---
          
          // Mode 1: LIQUID RIPPLE (Raindrop diffusion)
          if (uShapeMode > 0.5 && uShapeMode < 1.5) {
             float dist = length(pos.xz);
             // Create concentric waves moving outwards
             float wave = sin(dist * 0.3 - uTime * 2.0);
             pos.y += wave * (2.0 + uBeat * 2.0);
          }
          
          // Mode 2: CYBER FLOWER (Breathing/Twisting petals)
          else if (uShapeMode > 1.5 && uShapeMode < 2.5) {
             // Twist based on height
             float angle = uTime * 0.2 + pos.y * 0.05;
             float s = sin(angle);
             float c = cos(angle);
             float nx = pos.x * c - pos.z * s;
             float nz = pos.x * s + pos.z * c;
             pos.x = nx;
             pos.z = nz;
             
             // Bloom outward on beat
             pos += normalize(pos) * uBeat * 3.0;
          }
          
          // Mode 3: PULSING BLACK HOLE (Contraction/Expansion)
          else if (uShapeMode > 2.5 && uShapeMode < 3.5) {
             // Breathe effect
             float breathe = 1.0 + sin(uTime * 1.5) * 0.1;
             // Unstable core vibration
             if (length(pos) < 7.0) {
                pos *= breathe + (sin(uTime * 20.0) * uBeat * 0.2);
             } else {
                // Disk slow rotation handled by CPU usually, but let's warp it
                pos.y += sin(pos.x * 0.2 + uTime) * uBeat;
             }
          }
          
          // --- DEFAULT BEAT PULSE ---
          // Apply to all shapes slightly, but specific modes handled above
          if (uShapeMode < 0.5) {
              float dist = length(pos);
              pos += normalize(pos) * uBeat * (sin(dist * 0.1 - uTime) * 0.5 + 0.5) * 2.5;
          }
          
          // Jitter based on Treble (Sparkles)
          pos.x += sin(uTime * 10.0 + pos.y) * uTreble * 0.2;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // Size attenuation
          float sizePulse = 1.0 + sin(uTime * aFlashSpeed) * 0.3;
          gl_PointSize = uSize * aScale * sizePulse * uPixelRatio * (150.0 / -mvPosition.z);
          
          // Mix colors
          vec3 mixed = mix(uColor1, uColor2, aColorMix.x);
          mixed = mix(mixed, uColor3, aColorMix.y);
          
          // Flash white on high treble
          float flash = max(0.0, sin(uTime * 10.0 * aFlashSpeed) * uTreble);
          vColor = mix(mixed, vec3(1.0), flash * 0.5);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float alpha = 1.0 - (r * 2.0);
          alpha = pow(alpha, 1.5);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }
}

// --- BACKGROUND STARFIELD SHADER ---
class BackgroundStarMaterial extends THREE.ShaderMaterial {
  constructor() {
    super({
      uniforms: {
        uTime: { value: 0 },
        uColor1: { value: new THREE.Color('#4444ff') }, // Tint from config
        uBeat: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBeat;
        uniform float uPixelRatio;
        attribute float aSize;
        attribute float aOffset;
        
        varying float vAlpha;
        varying vec3 vColor; // Pass color to fragment

        uniform vec3 uColor1;

        void main() {
          vec3 pos = position;
          
          // Floating Drift Effect
          // Particles gently float in sine waves based on time and their offset
          float driftX = sin(uTime * 0.1 + aOffset) * 5.0;
          float driftY = cos(uTime * 0.15 + pos.x * 0.01) * 5.0;
          
          pos.x += driftX;
          pos.y += driftY;

          // Expand slightly with bass
          pos += normalize(pos) * uBeat * 2.0;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = aSize * uPixelRatio * (200.0 / -mvPosition.z);
          
          // Twinkle alpha
          float twinkle = 0.5 + 0.5 * sin(uTime * 2.0 + aOffset * 10.0);
          vAlpha = twinkle * (0.3 + uBeat * 0.5); // Brighten on beat

          // Subtle color shift
          vColor = mix(vec3(1.0), uColor1, 0.5); 
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          
          // Soft glow
          float glow = 1.0 - (r * 2.0);
          glow = pow(glow, 2.0);
          
          gl_FragColor = vec4(vColor, vAlpha * glow);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }
}

extend({ StarMaterial, BackgroundStarMaterial });

// --- SUB-COMPONENT: BACKGROUND PARTICLES ---
const BackgroundParticles = ({ config, getAudioData }: { config: VisualConfig, getAudioData: () => AudioData }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null);
  
  const COUNT = 6000;
  
  const { positions, sizes, offsets } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const sz = new Float32Array(COUNT);
    const off = new Float32Array(COUNT);
    
    for(let i=0; i<COUNT; i++) {
       // Spherical distribution, far away
       const r = 80 + Math.random() * 220; // 80 to 300 distance
       const theta = Math.random() * Math.PI * 2;
       const phi = Math.acos(2 * Math.random() - 1);
       
       pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
       pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta);
       pos[i*3+2] = r * Math.cos(phi);
       
       sz[i] = Math.random() * 4.0 + 1.0;
       off[i] = Math.random() * 100.0;
    }
    return { positions: pos, sizes: sz, offsets: off };
  }, []);

  useFrame((state) => {
     const time = state.clock.getElapsedTime();
     const audio = getAudioData();
     const beat = audio.averageFrequency / 255.0;

     if (pointsRef.current) {
        // Slow rotation of the entire background field
        pointsRef.current.rotation.y = time * 0.02;
        pointsRef.current.rotation.z = Math.sin(time * 0.01) * 0.05;
     }

     if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = time;
        materialRef.current.uniforms.uBeat.value = beat;
        
        // Tint background stars with the secondary color of the current theme
        const targetColor = new THREE.Color(config.colors[1]);
        materialRef.current.uniforms.uColor1.value.lerp(targetColor, 0.02);
     }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={COUNT} array={positions} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" count={COUNT} array={sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aOffset" count={COUNT} array={offsets} itemSize={1} />
      </bufferGeometry>
      <backgroundStarMaterial ref={materialRef} />
    </points>
  );
};

// --- MAIN SCENE COMPONENT ---
interface VisualizerSceneProps {
  config: VisualConfig;
  getAudioData: () => AudioData;
}

const VisualizerScene: React.FC<VisualizerSceneProps> = ({ config, getAudioData }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null);
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  
  // State for dynamic shape morphing
  const currentShapeRef = useRef<VisualShape>(config.shape);
  const lastShapeChangeTime = useRef<number>(0);
  
  // Available shapes for random cycling
  const allShapes = useMemo(() => Object.values(VisualShape), []);

  // Create Buffers for MAIN shape
  const { positions, randoms, colorMix, flashSpeeds } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3); // Current
    const rnd = new Float32Array(PARTICLE_COUNT); // Scale variation
    const col = new Float32Array(PARTICLE_COUNT * 3); // Mix factors
    const spd = new Float32Array(PARTICLE_COUNT); // Flash speeds
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      rnd[i] = Math.random() * 0.5 + 0.5;
      col[i * 3] = Math.random(); // Mix 1-2
      col[i * 3 + 1] = Math.random() * 0.5; // Mix result-3
      col[i * 3 + 2] = 0;
      spd[i] = 0.5 + Math.random() * 2.0;
    }
    return { positions: pos, randoms: rnd, colorMix: col, flashSpeeds: spd };
  }, []);

  // Initialize target positions when config changes (e.g. new song load)
  useEffect(() => {
    const targets = getShapePositions(config.shape, PARTICLE_COUNT, config.chaos);
    targetPositionsRef.current.set(targets);
    currentShapeRef.current = config.shape;
    lastShapeChangeTime.current = 0; // Reset timer
  }, [config.shape, config.chaos]);

  useFrame((state) => {
    const { clock } = state;
    const time = clock.getElapsedTime();
    const audio = getAudioData();
    
    // Beat Detection Logic
    const volume = audio.averageFrequency / 255.0; // 0 to 1
    
    // Extract High Freq (Treble) for sparkles
    const dataArray = audio.frequencyData;
    const lowerBound = Math.floor(dataArray.length * 0.7);
    let trebleSum = 0;
    for(let i=lowerBound; i < dataArray.length; i++) {
        trebleSum += dataArray[i];
    }
    const treble = (trebleSum / (dataArray.length - lowerBound)) / 255.0;

    // Dynamic Shape Switching
    const timeSinceLastChange = time - lastShapeChangeTime.current;
    
    // Auto-morph logic (unless we really want to stick to the exclusive one for a bit)
    if (timeSinceLastChange > 8.0) {
        // Higher probability to switch on beat
        const switchThreshold = 0.6; // High volume
        const forceSwitchTime = 20.0; // Max time to stay on one shape
        
        if (volume > switchThreshold || timeSinceLastChange > forceSwitchTime) {
            // Pick new random shape
            const candidates = allShapes.filter(s => s !== currentShapeRef.current);
            const nextShape = candidates[Math.floor(Math.random() * candidates.length)];
            
            const dynamicChaos = config.chaos + (volume * 0.2); 
            const newTargets = getShapePositions(nextShape, PARTICLE_COUNT, Math.min(1, dynamicChaos));
            
            targetPositionsRef.current.set(newTargets);
            currentShapeRef.current = nextShape;
            lastShapeChangeTime.current = time;
        }
    }

    // Determine Shape Mode for Shader Animation
    let shapeMode = 0.0;
    if (currentShapeRef.current === VisualShape.LIQUID_WAVE) shapeMode = 1.0;
    else if (currentShapeRef.current === VisualShape.CYBER_FLOWER) shapeMode = 2.0;
    else if (currentShapeRef.current === VisualShape.PULSING_BLACK_HOLE) shapeMode = 3.0;

    // Update Uniforms
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time * config.speed;
      materialRef.current.uniforms.uBeat.value = volume * 3.0; 
      materialRef.current.uniforms.uTreble.value = treble * 2.0; 
      materialRef.current.uniforms.uShapeMode.value = shapeMode;
      
      materialRef.current.uniforms.uColor1.value.lerp(new THREE.Color(config.colors[0]), 0.05);
      materialRef.current.uniforms.uColor2.value.lerp(new THREE.Color(config.colors[1]), 0.05);
      materialRef.current.uniforms.uColor3.value.lerp(new THREE.Color(config.colors[2]), 0.05);
    }

    // Update Particles
    if (pointsRef.current) {
      const currentPos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const targetPos = targetPositionsRef.current;

      const baseLerp = 0.02;
      const beatLerp = volume * 0.05;
      const lerpSpeed = baseLerp + beatLerp;

      // Global Rotation of main shape
      pointsRef.current.rotation.y += (0.001 * config.speed) + (volume * 0.01);
      pointsRef.current.rotation.z = Math.sin(time * 0.3) * 0.1;

      // Update particle positions
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        const i3 = i * 3;
        
        currentPos[i3] += (targetPos[i3] - currentPos[i3]) * lerpSpeed;
        currentPos[i3 + 1] += (targetPos[i3 + 1] - currentPos[i3 + 1]) * lerpSpeed;
        currentPos[i3 + 2] += (targetPos[i3 + 2] - currentPos[i3 + 2]) * lerpSpeed;
        
        // Add Audio Reactive Noise/Explosion
        if (volume > 0.8) {
            const push = (Math.random() - 0.5) * volume * 0.5;
            currentPos[i3] += push;
            currentPos[i3+1] += push;
            currentPos[i3+2] += push;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  return (
    <>
      <OrbitControls 
        enablePan={false} 
        enableZoom={true} 
        minDistance={20} 
        maxDistance={150} 
        autoRotate={false} 
      />
      
      {/* Background Floating Particles */}
      <BackgroundParticles config={config} getAudioData={getAudioData} />

      {/* Main Morphing Visualizer */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aScale"
            count={PARTICLE_COUNT}
            array={randoms}
            itemSize={1}
          />
          <bufferAttribute
            attach="attributes-aColorMix"
            count={PARTICLE_COUNT}
            array={colorMix}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-aFlashSpeed"
            count={PARTICLE_COUNT}
            array={flashSpeeds}
            itemSize={1}
          />
        </bufferGeometry>
        <starMaterial ref={materialRef} />
      </points>
    </>
  );
};

export default VisualizerScene;