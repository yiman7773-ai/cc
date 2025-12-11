import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { VisualShape, VisualConfig, AudioData, GestureState } from '../types';
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
        uShapeMode: { value: 0.0 },
        uWarp: { value: 0.0 }, 
        uShrink: { value: 1.0 },
        
        // Gesture Uniforms
        uHandGrip: { value: 0.0 }, // 1.0 = Max grip (implode), -1.0 = Max open (explode)
        uRightHandPos: { value: new THREE.Vector3(0, 0, 0) },
        uRightHandActive: { value: 0.0 } // 0 or 1
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBeat;
        uniform float uTreble;
        uniform float uPixelRatio;
        uniform float uSize;
        uniform float uShapeMode;
        uniform float uWarp;
        uniform float uShrink;
        
        uniform float uHandGrip;
        uniform vec3 uRightHandPos;
        uniform float uRightHandActive;
        
        attribute float aScale;
        attribute vec3 aColorMix;
        attribute float aFlashSpeed;
        varying vec3 vColor;
        
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;

        void main() {
          vec3 pos = position;
          
          // --- 1. GLOBAL FLOW & WARP ---
          float t = uTime * 0.5;
          vec3 flow = vec3(
             sin(pos.y * 0.05 + t),
             cos(pos.z * 0.05 + t * 0.8),
             sin(pos.x * 0.05 + t * 1.2)
          );
          pos += flow * uWarp;
          
          // --- 2. MUSIC REACTION (BREATH) ---
          pos *= uShrink;
          
          // --- 3. SHAPE ANIMATIONS ---
          if (uShapeMode > 0.5 && uShapeMode < 1.5) { // RIPPLE
             float dist = length(pos.xz);
             float wave = sin(dist * 0.3 - uTime * 2.0);
             pos.y += wave * (2.0 + uBeat * 2.0);
          }
          else if (uShapeMode > 1.5 && uShapeMode < 2.5) { // FLOWER
             float angle = uTime * 0.2 + pos.y * 0.05;
             float s = sin(angle);
             float c = cos(angle);
             float nx = pos.x * c - pos.z * s;
             float nz = pos.x * s + pos.z * c;
             pos.x = nx;
             pos.z = nz;
             pos += normalize(pos) * uBeat * 3.0;
          }
          else if (uShapeMode > 2.5 && uShapeMode < 3.5) { // PULSE
             float breathe = 1.0 + sin(uTime * 1.5) * 0.1;
             if (length(pos) < 7.0) {
                pos *= breathe + (sin(uTime * 20.0) * uBeat * 0.2);
             } else {
                pos.y += sin(pos.x * 0.2 + uTime) * uBeat;
             }
          }
          
          if (uShapeMode < 0.5) {
              float dist = length(pos);
              pos += normalize(pos) * uBeat * (sin(dist * 0.1 - uTime) * 0.5 + 0.5) * 2.5;
          }
          
          // --- 4. LEFT HAND CONTROL (Implode / Explode) ---
          if (uHandGrip > 0.01) {
             // Implode towards center
             pos = mix(pos, vec3(0.0), uHandGrip * 0.95); 
             pos += (vec3(sin(t*50.0), cos(t*45.0), sin(t*60.0)) * 0.5 * uHandGrip);
          } else if (uHandGrip < -0.01) {
             // Explode outward
             float blast = abs(uHandGrip);
             pos += normalize(pos) * blast * 40.0; 
             float rot = blast * 3.0;
             float s = sin(rot); float c = cos(rot);
             pos.xy = mat2(c, -s, s, c) * pos.xy;
          }

          // --- 5. RIGHT HAND INTERACTION (Water Wave Diffusion) ---
          if (uRightHandActive > 0.5) {
             float d = distance(pos.xy, uRightHandPos.xy);
             float radius = 30.0; // Radius of the water effect
             
             if (d < radius) {
                // Decay: 1.0 at center -> 0.0 at radius
                float decay = smoothstep(radius, 0.0, d);
                
                // Ripple calculation:
                // Frequency * Distance - Time * Speed
                float ripplePhase = d * 3.0 - uTime * 15.0;
                float ripple = sin(ripplePhase);
                
                // Strength decays with distance from hand
                float strength = 5.0 * decay;
                
                // Apply wave motion primarily to Z (depth) to simulate surface
                pos.z += ripple * strength;
                
                // Also add slight radial dispersion (pushing water out)
                if (d > 0.1) {
                    vec2 dir = normalize(pos.xy - uRightHandPos.xy);
                    pos.xy += dir * ripple * strength * 0.2;
                }
             }
          }

          // Jitter (Sparkles)
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

          // Highlight Right Hand Ripples
          if (uRightHandActive > 0.5) {
             float d = distance(pos.xy, uRightHandPos.xy);
             if (d < 30.0) {
                 float decay = smoothstep(30.0, 0.0, d);
                 float ripple = sin(d * 3.0 - uTime * 15.0);
                 
                 // Highlight the "crests" of the wave
                 float wavePeak = smoothstep(0.4, 1.0, ripple);
                 
                 // Cyan/White water highlight color
                 vec3 waterHighlight = vec3(0.6, 0.9, 1.0); 
                 
                 // Apply highlight based on wave peak and distance decay
                 vColor = mix(vColor, waterHighlight, wavePeak * decay * 0.8);
             }
          }
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
        uColor1: { value: new THREE.Color('#4444ff') },
        uBeat: { value: 0 },
        uTreble: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) }
      },
      vertexShader: `
        uniform float uTime;
        uniform float uBeat;
        uniform float uTreble;
        uniform float uPixelRatio;
        attribute float aSize;
        attribute float aOffset;
        
        varying float vAlpha;
        varying vec3 vColor;

        uniform vec3 uColor1;

        void main() {
          vec3 pos = position;
          float dist = length(pos.xz);
          float angle = atan(pos.z, pos.x);
          float speed = 0.05 + (15.0 / (dist + 1.0));
          // Removed the extra rotation calculation to keep it stable but alive
          float newAngle = angle + (uTime * 0.02 * speed) + (uBeat * 0.01);
          
          pos.x = dist * cos(newAngle);
          pos.z = dist * sin(newAngle);
          pos.y += sin(uTime * 0.5 + aOffset * 10.0) * 4.0;
          pos += normalize(pos) * uBeat * 3.0;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = aSize * uPixelRatio * (180.0 / -mvPosition.z);
          
          float twinkleSpeed = 2.0 + (uTreble * 10.0);
          float twinkle = 0.5 + 0.5 * sin(uTime * twinkleSpeed + aOffset * 20.0);
          
          vAlpha = twinkle * (0.3 + uBeat * 0.4);
          vColor = mix(vec3(0.8), uColor1, 0.6); 
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
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

// --- BACKGROUND PARTICLES ---
const BackgroundParticles = ({ config, getAudioData }: { config: VisualConfig, getAudioData: () => AudioData }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null);
  const COUNT = 8000;
  
  const { positions, sizes, offsets } = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const sz = new Float32Array(COUNT);
    const off = new Float32Array(COUNT);
    for(let i=0; i<COUNT; i++) {
       const r = 40 + Math.pow(Math.random(), 1.5) * 260; 
       const theta = Math.random() * Math.PI * 2;
       const phi = Math.acos(2 * Math.random() - 1);
       const yMult = 0.6 + Math.random() * 0.4;
       pos[i*3] = r * Math.sin(phi) * Math.cos(theta);
       pos[i*3+1] = r * Math.sin(phi) * Math.sin(theta) * yMult;
       pos[i*3+2] = r * Math.cos(phi);
       sz[i] = Math.random() * 3.0 + 0.5;
       off[i] = Math.random() * 100.0;
    }
    return { positions: pos, sizes: sz, offsets: off };
  }, []);

  useFrame((state) => {
     const time = state.clock.getElapsedTime();
     const audio = getAudioData();
     const beat = audio.averageFrequency / 255.0;
     const dataArray = audio.frequencyData;
     const lowerBound = Math.floor(dataArray.length * 0.7);
     let trebleSum = 0;
     for(let i=lowerBound; i < dataArray.length; i++) {
         trebleSum += dataArray[i];
     }
     const treble = (trebleSum / (dataArray.length - lowerBound)) / 255.0;

     // Removed automatic Y rotation here
     if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = time;
        materialRef.current.uniforms.uBeat.value = beat;
        materialRef.current.uniforms.uTreble.value = treble;
        materialRef.current.uniforms.uColor1.value.lerp(new THREE.Color(config.colors[1]), 0.02);
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
  gestureRef: React.MutableRefObject<GestureState>;
}

const VisualizerScene: React.FC<VisualizerSceneProps> = ({ config, getAudioData, gestureRef }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null);
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  
  const currentShapeRef = useRef<VisualShape>(config.shape);
  const lastShapeChangeTime = useRef<number>(0);
  
  const allShapes = useMemo(() => Object.values(VisualShape), []);

  const { positions, randoms, colorMix, flashSpeeds } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3); 
    const rnd = new Float32Array(PARTICLE_COUNT); 
    const col = new Float32Array(PARTICLE_COUNT * 3); 
    const spd = new Float32Array(PARTICLE_COUNT); 
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      rnd[i] = Math.random() * 0.5 + 0.5;
      col[i * 3] = Math.random(); 
      col[i * 3 + 1] = Math.random() * 0.5; 
      col[i * 3 + 2] = 0;
      spd[i] = 0.5 + Math.random() * 2.0;
    }
    return { positions: pos, randoms: rnd, colorMix: col, flashSpeeds: spd };
  }, []);

  useEffect(() => {
    const targets = getShapePositions(config.shape, PARTICLE_COUNT, config.chaos);
    targetPositionsRef.current.set(targets);
    currentShapeRef.current = config.shape;
    lastShapeChangeTime.current = 0; 
  }, [config.shape, config.chaos]);

  useFrame((state) => {
    const { clock } = state;
    const time = clock.getElapsedTime();
    const audio = getAudioData();
    const volume = audio.averageFrequency / 255.0; 
    
    // Treble
    const dataArray = audio.frequencyData;
    const lowerBound = Math.floor(dataArray.length * 0.7);
    let trebleSum = 0;
    for(let i=lowerBound; i < dataArray.length; i++) {
        trebleSum += dataArray[i];
    }
    const treble = (trebleSum / (dataArray.length - lowerBound)) / 255.0;

    // --- SHAPE SWITCHING LOGIC ---
    const timeSinceLastChange = time - lastShapeChangeTime.current;
    if (timeSinceLastChange > 6.0) { 
        const switchThreshold = 0.5; 
        const forceSwitchTime = 15.0; 
        if (volume > switchThreshold || timeSinceLastChange > forceSwitchTime) {
            const candidates = allShapes.filter(s => s !== currentShapeRef.current);
            const nextShape = candidates[Math.floor(Math.random() * candidates.length)];
            const dynamicChaos = config.chaos + (volume * 0.2); 
            const newTargets = getShapePositions(nextShape, PARTICLE_COUNT, Math.min(1, dynamicChaos));
            targetPositionsRef.current.set(newTargets);
            currentShapeRef.current = nextShape;
            lastShapeChangeTime.current = time;
        }
    }

    let shapeMode = 0.0;
    if (currentShapeRef.current === VisualShape.LIQUID_WAVE) shapeMode = 1.0;
    else if (currentShapeRef.current === VisualShape.CYBER_FLOWER) shapeMode = 2.0;
    else if (currentShapeRef.current === VisualShape.PULSING_BLACK_HOLE) shapeMode = 3.0;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time * config.speed;
      materialRef.current.uniforms.uBeat.value = volume * 3.0; 
      materialRef.current.uniforms.uTreble.value = treble * 2.0; 
      materialRef.current.uniforms.uShapeMode.value = shapeMode;
      materialRef.current.uniforms.uWarp.value = 3.0 + Math.sin(time * 0.2) * 2.0; 
      materialRef.current.uniforms.uShrink.value = 1.0 - (volume * 0.2) + (Math.sin(time) * 0.1);

      // --- GESTURE UPDATES ---
      const gesture = gestureRef.current;
      
      // Left Hand (Control)
      let gripVal = 0.0;
      if (gesture.leftHand.active) {
         if (gesture.leftHand.isFist) {
            gripVal = gesture.leftHand.strength; // Positive for Implode
         } else {
            gripVal = -gesture.leftHand.strength; // Negative for Explode
         }
      }
      const currentGrip = materialRef.current.uniforms.uHandGrip.value;
      materialRef.current.uniforms.uHandGrip.value = THREE.MathUtils.lerp(currentGrip, gripVal, 0.1);

      // Right Hand (Interact)
      if (gesture.rightHand.active) {
         materialRef.current.uniforms.uRightHandActive.value = 1.0;
         const screenScale = 30.0; 
         const currentX = materialRef.current.uniforms.uRightHandPos.value.x;
         const currentY = materialRef.current.uniforms.uRightHandPos.value.y;
         
         // Increased lerp speed (0.2) for more responsive ripples
         materialRef.current.uniforms.uRightHandPos.value.set(
            THREE.MathUtils.lerp(currentX, gesture.rightHand.x * screenScale, 0.2),
            THREE.MathUtils.lerp(currentY, gesture.rightHand.y * screenScale, 0.2),
            0
         );
      } else {
         materialRef.current.uniforms.uRightHandActive.value = 0.0;
      }

      materialRef.current.uniforms.uColor1.value.lerp(new THREE.Color(config.colors[0]), 0.05);
      materialRef.current.uniforms.uColor2.value.lerp(new THREE.Color(config.colors[1]), 0.05);
      materialRef.current.uniforms.uColor3.value.lerp(new THREE.Color(config.colors[2]), 0.05);
    }

    if (pointsRef.current) {
      const currentPos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const targetPos = targetPositionsRef.current;
      const lerpSpeed = 0.03 + (volume * 0.08);

      // REMOVED: Automatic rotation
      // pointsRef.current.rotation.y += (0.001 * config.speed) + (volume * 0.01);
      // pointsRef.current.rotation.z = Math.sin(time * 0.3) * 0.1;

      // Only morph if hand is NOT imploding strongly
      const handGrip = materialRef.current?.uniforms.uHandGrip.value || 0;
      if (handGrip < 0.5) {
          for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3;
            currentPos[i3] += (targetPos[i3] - currentPos[i3]) * lerpSpeed;
            currentPos[i3 + 1] += (targetPos[i3 + 1] - currentPos[i3 + 1]) * lerpSpeed;
            currentPos[i3 + 2] += (targetPos[i3 + 2] - currentPos[i3 + 2]) * lerpSpeed;
            
            if (volume > 0.8) {
                const push = (Math.random() - 0.5) * volume * 0.5;
                currentPos[i3] += push;
                currentPos[i3+1] += push;
                currentPos[i3+2] += push;
            }
          }
          pointsRef.current.geometry.attributes.position.needsUpdate = true;
      }
    }
  });

  return (
    <>
      <OrbitControls makeDefault enableDamping dampingFactor={0.05} autoRotate={false} />
      <BackgroundParticles config={config} getAudioData={getAudioData} />
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-aScale" count={PARTICLE_COUNT} array={randoms} itemSize={1} />
          <bufferAttribute attach="attributes-aColorMix" count={PARTICLE_COUNT} array={colorMix} itemSize={3} />
          <bufferAttribute attach="attributes-aFlashSpeed" count={PARTICLE_COUNT} array={flashSpeeds} itemSize={1} />
        </bufferGeometry>
        <starMaterial ref={materialRef} />
      </points>
    </>
  );
};

export default VisualizerScene;