import React, { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, extend, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { OrbitControls } from '@react-three/drei';
import { VisualShape, VisualConfig, VisualSettings, AudioData, GestureState } from '../types';
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
        uSize: { value: 1.2 },
        uShapeMode: { value: 0.0 },
        uWarp: { value: 0.0 }, 
        uShrink: { value: 1.0 },
        
        // New Uniforms for Fine Tuning
        uVisibleCount: { value: PARTICLE_COUNT },
        uBrightness: { value: 1.0 },
        
        // Gesture Uniforms
        uHandGrip: { value: 0.0 }, // 1.0 = Max grip (implode), -1.0 = Max open (explode)
        uRightHandPos: { value: new THREE.Vector3(0, 0, 0) },
        uRightHandActive: { value: 0.0 }, // 0 or 1
        uRainState: { value: 0.0 } // 0.0 = Normal, 1.0 = Rain
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
        
        uniform float uVisibleCount;
        
        uniform float uHandGrip;
        uniform vec3 uRightHandPos;
        uniform float uRightHandActive;
        uniform float uRainState;
        
        attribute float aScale;
        attribute vec3 aColorMix;
        attribute float aFlashSpeed;
        attribute float aSpriteType; // 0=Star, 1=Note1, 2=Note2
        attribute float aIndex; 
        
        varying vec3 vColor;
        varying float vSpriteType;
        varying float vRot; // Rotation for notes
        
        uniform vec3 uColor1;
        uniform vec3 uColor2;
        uniform vec3 uColor3;

        // 3D Noise function (Simplex-like)
        vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
        vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
        vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

        float snoise(vec3 v) {
          const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
          const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

          vec3 i  = floor(v + dot(v, C.yyy) );
          vec3 x0 = v - i + dot(i, C.xxx) ;

          vec3 g = step(x0.yzx, x0.xyz);
          vec3 l = 1.0 - g;
          vec3 i1 = min( g.xyz, l.zxy );
          vec3 i2 = max( g.xyz, l.zxy );

          vec3 x1 = x0 - i1 + C.xxx;
          vec3 x2 = x0 - i2 + C.yyy;
          vec3 x3 = x0 - D.yyy;

          i = mod289(i);
          vec4 p = permute( permute( permute(
                     i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
                   + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
                   + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

          float n_ = 0.142857142857;
          vec3  ns = n_ * D.wyz - D.xzx;

          vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

          vec4 x_ = floor(j * ns.z);
          vec4 y_ = floor(j - 7.0 * x_ );

          vec4 x = x_ *ns.x + ns.yyyy;
          vec4 y = y_ *ns.x + ns.yyyy;
          vec4 h = 1.0 - abs(x) - abs(y);

          vec4 b0 = vec4( x.xy, y.xy );
          vec4 b1 = vec4( x.zw, y.zw );

          vec4 s0 = floor(b0)*2.0 + 1.0;
          vec4 s1 = floor(b1)*2.0 + 1.0;
          vec4 sh = -step(h, vec4(0.0));

          vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
          vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

          vec3 p0 = vec3(a0.xy,h.x);
          vec3 p1 = vec3(a0.zw,h.y);
          vec3 p2 = vec3(a1.xy,h.z);
          vec3 p3 = vec3(a1.zw,h.w);

          vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
          p0 *= norm.x;
          p1 *= norm.y;
          p2 *= norm.z;
          p3 *= norm.w;

          vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
          m = m * m;
          return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1),
                                        dot(p2,x2), dot(p3,x3) ) );
        }

        // Pseudo-random generator for rain distribution
        float rand(float n) { return fract(sin(n) * 43758.5453123); }

        void main() {
          vSpriteType = aSpriteType;
          vec3 pos = position;
          
          float t = uTime * 0.5;
          float sizeFactor = 1.0; // Dynamic size adjustment
          
          // --- SMOOTH FLOATING MOTION (NO JITTER) ---
          vec3 flow = vec3(
             sin(pos.y * 0.05 + t * 0.8) * 0.5,
             cos(pos.z * 0.04 + t * 0.6) * 0.5,
             sin(pos.x * 0.05 + t * 0.7) * 0.5
          );
          
          // NOTES FLOATING LOGIC
          if (aSpriteType > 0.5) {
             float noteTime = uTime * 0.3 + aScale * 100.0;
             vec3 drift = vec3(
                sin(noteTime * 0.7) * 20.0,
                cos(noteTime * 0.5) * 20.0,
                sin(noteTime * 0.9) * 20.0
             );
             pos = mix(pos, pos + drift, 0.8);
             vRot = uTime * (0.5 + aFlashSpeed) + aScale * 10.0;
          } else {
             vRot = 0.0;
             pos += flow * uWarp;
          }
          
          // --- MUSIC REACTION ---
          pos *= uShrink;
          
          // --- SHAPE ANIMATIONS ---
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
          
          if (uShapeMode < 0.5 && aSpriteType < 0.5) {
              float dist = length(pos);
              pos += normalize(pos) * uBeat * (sin(dist * 0.1 - uTime) * 0.5 + 0.5) * 1.5;
          }
          
          // --- HAND CONTROLS (Left/Right) ---
          if (uHandGrip > 0.01) {
             pos = mix(pos, vec3(0.0), uHandGrip * 0.95); 
             pos += (vec3(sin(t*50.0), cos(t*45.0), sin(t*60.0)) * 0.5 * uHandGrip);
          } else if (uHandGrip < -0.01) {
             float blast = abs(uHandGrip);
             pos += normalize(pos) * blast * 40.0; 
             float rot = blast * 3.0;
             float s = sin(rot); float c = cos(rot);
             pos.xy = mat2(c, -s, s, c) * pos.xy;
          }

          if (uRightHandActive > 0.5) {
             float d = distance(pos.xy, uRightHandPos.xy);
             float radius = 30.0;
             if (d < radius) {
                float decay = smoothstep(radius, 0.0, d);
                float ripplePhase = d * 3.0 - uTime * 15.0;
                float ripple = sin(ripplePhase);
                float strength = 5.0 * decay;
                pos.z += ripple * strength;
                if (d > 0.1) {
                    vec2 dir = normalize(pos.xy - uRightHandPos.xy);
                    pos.xy += dir * ripple * strength * 0.2;
                }
             }
          }

          // --- RAIN EFFECT (GESTURE 2) ---
          if (uRainState > 0.01) {
             // Only select partial particles (approx 20%)
             if (mod(aIndex, 5.0) < 1.0) {
                 // 1. Calculate Rain Coordinates
                 // SCATTER ACROSS SCREEN: Random X/Z
                 float rainX = (rand(aIndex) - 0.5) * 200.0; 
                 float rainZ = (rand(aIndex + 42.0) - 0.5) * 100.0;
                 
                 // Very Slow fall speed (1.0 base)
                 float fallSpeed = 1.0 + (aScale * 1.5); 
                 
                 float floorLevel = -35.0;
                 float ceilingLevel = 55.0; 
                 float totalHeight = ceilingLevel - floorLevel;
                 float splashBuffer = 5.0; 
                 float cycleLength = totalHeight + splashBuffer;
                 
                 float offset = rand(aIndex * 13.0) * 100.0;
                 float tFall = (uTime * fallSpeed) + offset;
                 float rawY = ceilingLevel - mod(tFall, cycleLength);
                 
                 vec3 rainPos = vec3(rainX, rawY, rainZ);
                 
                 // 2. Splash Logic
                 if (rawY < floorLevel) {
                     float splashProgress = (floorLevel - rawY) / splashBuffer; 
                     splashProgress = clamp(splashProgress, 0.0, 1.0);
                     
                     // Strong bounce for obvious effect
                     rainPos.y = floorLevel + sin(splashProgress * 3.14159) * 10.0;
                     
                     // Wide outward expansion
                     float angle = aScale * 62.8; 
                     float radius = splashProgress * 35.0;
                     
                     rainPos.x += cos(angle) * radius;
                     rainPos.z += sin(angle) * radius;
                     
                     // Size Pop: Grow bigger on impact to make it visible
                     sizeFactor = 1.0 + (sin(splashProgress * 3.14159) * 3.0);
                 }

                 // 3. Interpolate from Shape to Rain
                 pos = mix(pos, rainPos, uRainState);
             }
          }

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          // --- SIZE & PULSE ---
          float beatSignal = smoothstep(1.0, 2.8, uBeat); 
          float pulse = 1.0 + (sin(uTime * 3.0 + aScale * 10.0) * 0.3);
          pulse += beatSignal * 0.8;
          
          float sizeMult = (aSpriteType > 0.5) ? 3.0 : 1.0;
          float finalSize = uSize * aScale * sizeMult * pulse * uPixelRatio * (150.0 / -mvPosition.z);
          
          // Apply splash size factor
          finalSize *= sizeFactor;
          
          if (aIndex > uVisibleCount) {
             finalSize = 0.0;
          }
          
          gl_PointSize = finalSize;
          
          // --- COLOR ---
          float n = snoise(pos * 0.03 + t * 0.2); 
          float n2 = snoise(pos * 0.05 - t * 0.15);
          
          vec3 cA = mix(uColor1, uColor2, n * 0.5 + 0.5);
          vec3 cB = mix(cA, uColor3, n2 * 0.5 + 0.5);
          
          float depth = smoothstep(120.0, 20.0, -mvPosition.z);
          vec3 finalColor = cB * depth;
          
          finalColor += uColor1 * beatSignal * 0.5;
          
          if (aSpriteType > 0.5) {
             finalColor = mix(finalColor, vec3(1.0), 0.5);
          }

          if (uRightHandActive > 0.5) {
             float d = distance(pos.xy, uRightHandPos.xy);
             if (d < 30.0) {
                 float decay = smoothstep(30.0, 0.0, d);
                 float wavePeak = smoothstep(0.4, 1.0, sin(d * 3.0 - uTime * 15.0));
                 finalColor = mix(finalColor, vec3(0.6, 0.9, 1.0), wavePeak * decay * 0.8);
             }
          }

          // Rain Color Override
          if (uRainState > 0.01) {
              // Apply color override only to rain particles
              if (mod(aIndex, 5.0) < 1.0) {
                  vec3 rainBlue = vec3(0.6, 0.9, 1.0);
                  vec3 splashWhite = vec3(1.0, 1.0, 1.0); // Bright white
                  
                  vec3 targetColor = rainBlue;
                  
                  // Flash white when splashing (checking Y coordinate range)
                  if (pos.y < -30.0) {
                      targetColor = splashWhite;
                      targetColor *= 2.0; // Bloom boost
                  }
                  
                  finalColor = mix(finalColor, targetColor, uRainState * 0.9);
              }
          }
          
          vColor = finalColor;
        }
      `,
      fragmentShader: `
        uniform float uBrightness;
        varying vec3 vColor;
        varying float vSpriteType;
        varying float vRot;

        float circle(vec2 uv, vec2 center, float radius) {
            return length(uv - center) - radius;
        }

        float box(vec2 uv, vec2 center, vec2 size) {
            vec2 d = abs(uv - center) - size;
            return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
        }

        // SDF for Single Note (♪)
        float note1(vec2 uv) {
            float d = circle(uv, vec2(0.35, 0.3), 0.15);
            d = min(d, box(uv, vec2(0.48, 0.55), vec2(0.04, 0.25)));
            vec2 flagPos = uv - vec2(0.48, 0.8);
            float angle = -0.5;
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            flagPos = rot * flagPos;
            d = min(d, box(flagPos, vec2(0.15, 0.0), vec2(0.15, 0.04)));
            return d;
        }

        // SDF for Beamed Note (♫)
        float note2(vec2 uv) {
            float d = circle(uv, vec2(0.25, 0.25), 0.12);
            d = min(d, circle(uv, vec2(0.75, 0.25), 0.12));
            d = min(d, box(uv, vec2(0.35, 0.5), vec2(0.03, 0.25)));
            d = min(d, box(uv, vec2(0.85, 0.5), vec2(0.03, 0.25)));
            d = min(d, box(uv, vec2(0.6, 0.75), vec2(0.28, 0.05)));
            return d;
        }

        void main() {
          vec2 uv = gl_PointCoord;
          
          if (vSpriteType > 0.5) {
              vec2 centered = uv - 0.5;
              float s = sin(vRot);
              float c = cos(vRot);
              mat2 rotMat = mat2(c, -s, s, c);
              uv = (centered * rotMat) + 0.5;
          }

          float alpha = 0.0;

          if (vSpriteType < 0.5) {
             float r = distance(uv, vec2(0.5));
             if (r > 0.5) discard;
             alpha = 1.0 - (r * 2.0);
             alpha = pow(alpha, 1.5);
          } else if (vSpriteType < 1.5) {
             float dist = note1(uv);
             alpha = 1.0 - smoothstep(0.0, 0.05, dist);
             if (alpha < 0.1) discard;
          } else {
             float dist = note2(uv);
             alpha = 1.0 - smoothstep(0.0, 0.05, dist);
             if (alpha < 0.1) discard;
          }

          gl_FragColor = vec4(vColor * uBrightness, alpha);
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
        uColor2: { value: new THREE.Color('#000000') },
        uBeat: { value: 0 },
        uTreble: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uBrightness: { value: 1.0 }
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
        uniform vec3 uColor2;

        void main() {
          vec3 pos = position;
          float dist = length(pos.xz);
          float angle = atan(pos.z, pos.x);
          float speed = 0.05 + (15.0 / (dist + 1.0));
          float newAngle = angle + (uTime * 0.02 * speed) + (uBeat * 0.01);
          
          pos.x = dist * cos(newAngle);
          pos.z = dist * sin(newAngle);
          pos.y += sin(uTime * 0.5 + aOffset * 10.0) * 4.0;
          pos += normalize(pos) * uBeat * 3.0;

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          
          gl_PointSize = aSize * uPixelRatio * (180.0 / -mvPosition.z);
          
          float twinkleSpeed = 2.0 + (uTreble * 15.0);
          float twinkle = 0.5 + 0.5 * sin(uTime * twinkleSpeed + aOffset * 20.0);
          float beatPulse = smoothstep(1.0, 2.5, uBeat);
          vAlpha = twinkle * (0.3 + beatPulse * 0.6); 
          
          float heightGradient = smoothstep(-50.0, 50.0, pos.y);
          vec3 baseColor = mix(uColor2, uColor1, heightGradient);
          vColor = mix(vec3(0.8), baseColor, 0.6); 
        }
      `,
      fragmentShader: `
        varying float vAlpha;
        varying vec3 vColor;
        uniform float uBrightness;
        void main() {
          float r = distance(gl_PointCoord, vec2(0.5));
          if (r > 0.5) discard;
          float glow = 1.0 - (r * 2.0);
          glow = pow(glow, 2.0);
          gl_FragColor = vec4(vColor * uBrightness, vAlpha * glow);
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
const BackgroundParticles = ({ config, settings, getAudioData, accumulatedTime }: { config: VisualConfig, settings: VisualSettings, getAudioData: () => AudioData, accumulatedTime: number }) => {
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
       sz[i] = Math.random() * 1.5 + 0.2; 
       off[i] = Math.random() * 100.0;
    }
    return { positions: pos, sizes: sz, offsets: off };
  }, []);

  useFrame((state) => {
     // Use passed accumulatedTime which is synced to music speed
     const time = accumulatedTime; 
     const audio = getAudioData();
     const beat = audio.averageFrequency / 255.0;
     const dataArray = audio.frequencyData;
     const lowerBound = Math.floor(dataArray.length * 0.7);
     let trebleSum = 0;
     for(let i=lowerBound; i < dataArray.length; i++) {
         trebleSum += dataArray[i];
     }
     const treble = (trebleSum / (dataArray.length - lowerBound)) / 255.0;

     const hueShift = time * 0.02;
     const bgC1 = new THREE.Color(config.colors[1]).offsetHSL(hueShift, 0, 0); 
     const bgC2 = new THREE.Color(config.colors[0]).offsetHSL(hueShift + 0.5, 0, -0.2); 

     if (materialRef.current) {
        materialRef.current.uniforms.uTime.value = time;
        materialRef.current.uniforms.uBeat.value = beat * 3.0; 
        materialRef.current.uniforms.uTreble.value = treble;
        materialRef.current.uniforms.uColor1.value.lerp(bgC1, 0.05);
        materialRef.current.uniforms.uColor2.value.lerp(bgC2, 0.05);
        materialRef.current.uniforms.uBrightness.value = settings.brightness * 0.7; // Background slightly dimmer
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
  settings: VisualSettings;
  getAudioData: () => AudioData;
  gestureRef: React.MutableRefObject<GestureState>;
}

const VisualizerScene: React.FC<VisualizerSceneProps> = ({ config, settings, getAudioData, gestureRef }) => {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<any>(null);
  const targetPositionsRef = useRef<Float32Array>(new Float32Array(PARTICLE_COUNT * 3));
  
  const currentShapeRef = useRef<VisualShape>(config.shape);
  const lastShapeChangeTime = useRef<number>(0);
  
  // Track accumulated time for sound-reactive speed control
  const accumulatedTimeRef = useRef<number>(0);
  
  const allShapes = useMemo(() => Object.values(VisualShape), []);

  const { positions, randoms, colorMix, flashSpeeds, spriteTypes, indices } = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3); 
    const rnd = new Float32Array(PARTICLE_COUNT); 
    const col = new Float32Array(PARTICLE_COUNT * 3); 
    const spd = new Float32Array(PARTICLE_COUNT); 
    const types = new Float32Array(PARTICLE_COUNT);
    const idx = new Float32Array(PARTICLE_COUNT);
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      rnd[i] = Math.random() * 0.5 + 0.5;
      col[i * 3] = Math.random(); 
      col[i * 3 + 1] = Math.random() * 0.5; 
      col[i * 3 + 2] = 0;
      spd[i] = 0.5 + Math.random() * 2.0;
      idx[i] = i;
      
      // Reduce notes to ~3% total
      const r = Math.random();
      if (r > 0.985) types[i] = 2.0; 
      else if (r > 0.97) types[i] = 1.0; 
      else types[i] = 0.0;
    }
    return { positions: pos, randoms: rnd, colorMix: col, flashSpeeds: spd, spriteTypes: types, indices: idx };
  }, []);

  useEffect(() => {
    const targets = getShapePositions(config.shape, PARTICLE_COUNT, config.chaos);
    targetPositionsRef.current.set(targets);
    currentShapeRef.current = config.shape;
    lastShapeChangeTime.current = 0; 
  }, [config.shape, config.chaos]);

  useFrame((state, delta) => {
    // --- SOUND REACTIVE SPEED CONTROL ---
    const audio = getAudioData();
    const volume = audio.averageFrequency / 255.0; 
    
    // Base speed + Volume influence
    const speedMultiplier = config.speed * (0.5 + (volume * 2.0)); 
    accumulatedTimeRef.current += delta * speedMultiplier;
    
    const time = accumulatedTimeRef.current;
    
    // Treble
    const dataArray = audio.frequencyData;
    const lowerBound = Math.floor(dataArray.length * 0.7);
    let trebleSum = 0;
    for(let i=lowerBound; i < dataArray.length; i++) {
        trebleSum += dataArray[i];
    }
    const treble = (trebleSum / (dataArray.length - lowerBound)) / 255.0;

    // --- SHAPE SWITCHING LOGIC ---
    const realTime = state.clock.getElapsedTime();
    const timeSinceLastChange = realTime - lastShapeChangeTime.current;
    
    const switchInterval = 6.0 / (0.5 + volume); 
    
    if (timeSinceLastChange > switchInterval) { 
        const switchThreshold = 0.5; 
        const forceSwitchTime = 15.0; 
        if (volume > switchThreshold || timeSinceLastChange > forceSwitchTime) {
            const candidates = allShapes.filter(s => s !== currentShapeRef.current);
            const nextShape = candidates[Math.floor(Math.random() * candidates.length)];
            const dynamicChaos = config.chaos + (volume * 0.2); 
            const newTargets = getShapePositions(nextShape, PARTICLE_COUNT, Math.min(1, dynamicChaos));
            targetPositionsRef.current.set(newTargets);
            currentShapeRef.current = nextShape;
            lastShapeChangeTime.current = realTime;
        }
    }

    let shapeMode = 0.0;
    if (currentShapeRef.current === VisualShape.LIQUID_WAVE) shapeMode = 1.0;
    else if (currentShapeRef.current === VisualShape.CYBER_FLOWER) shapeMode = 2.0;
    else if (currentShapeRef.current === VisualShape.PULSING_BLACK_HOLE) shapeMode = 3.0;

    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = time; // Dynamic speed time
      materialRef.current.uniforms.uBeat.value = volume * 3.0; 
      materialRef.current.uniforms.uTreble.value = treble * 2.0; 
      materialRef.current.uniforms.uShapeMode.value = shapeMode;
      
      // Map trail strength to warp
      // Higher trail strength = more flow/warp distortion
      const baseWarp = 3.0 + Math.sin(time * 0.2) * 2.0;
      materialRef.current.uniforms.uWarp.value = baseWarp * (0.5 + settings.trailStrength * 1.5); 
      
      materialRef.current.uniforms.uShrink.value = 1.0 - (volume * 0.2) + (Math.sin(time) * 0.1);

      // Fine tuning uniforms
      materialRef.current.uniforms.uVisibleCount.value = settings.particleCount;
      materialRef.current.uniforms.uSize.value = settings.particleSize * 1.2;
      materialRef.current.uniforms.uBrightness.value = settings.brightness;

      // --- GESTURE UPDATES ---
      const gesture = gestureRef.current;
      
      // Left Hand (Control)
      let gripVal = 0.0;
      if (gesture.leftHand.active) {
         if (gesture.leftHand.isFist) {
            gripVal = gesture.leftHand.strength; 
         } else {
            gripVal = -gesture.leftHand.strength; 
         }
      }
      const currentGrip = materialRef.current.uniforms.uHandGrip.value;
      materialRef.current.uniforms.uHandGrip.value = THREE.MathUtils.lerp(currentGrip, gripVal, 0.1);

      // Right Hand (Interact - Rain vs Touch)
      
      // Handle Rain State
      const targetRain = gesture.rightHand.active && gesture.rightHand.gesture === 'RAIN' ? 1.0 : 0.0;
      const currentRain = materialRef.current.uniforms.uRainState.value;
      materialRef.current.uniforms.uRainState.value = THREE.MathUtils.lerp(currentRain, targetRain, 0.05);

      // Handle Ripple/Touch Interaction (Only if active and NOT Rain)
      if (gesture.rightHand.active && gesture.rightHand.gesture === 'TOUCH') {
         materialRef.current.uniforms.uRightHandActive.value = 1.0;
         const screenScale = 30.0; 
         const currentX = materialRef.current.uniforms.uRightHandPos.value.x;
         const currentY = materialRef.current.uniforms.uRightHandPos.value.y;
         
         materialRef.current.uniforms.uRightHandPos.value.set(
            THREE.MathUtils.lerp(currentX, gesture.rightHand.x * screenScale, 0.2),
            THREE.MathUtils.lerp(currentY, gesture.rightHand.y * screenScale, 0.2),
            0
         );
      } else {
         materialRef.current.uniforms.uRightHandActive.value = 0.0;
      }

      // --- COLOR UPDATE ---
      const hueRotationSpeed = 0.05; 
      const hueOffset = time * hueRotationSpeed;
      
      const c1 = new THREE.Color(config.colors[0]).offsetHSL(hueOffset, 0, 0);
      const c2 = new THREE.Color(config.colors[1]).offsetHSL(hueOffset, 0, 0);
      const c3 = new THREE.Color(config.colors[2]).offsetHSL(hueOffset, 0, 0);

      materialRef.current.uniforms.uColor1.value.lerp(c1, 0.1);
      materialRef.current.uniforms.uColor2.value.lerp(c2, 0.1);
      materialRef.current.uniforms.uColor3.value.lerp(c3, 0.1);
    }

    if (pointsRef.current) {
      const currentPos = pointsRef.current.geometry.attributes.position.array as Float32Array;
      const targetPos = targetPositionsRef.current;
      // Interpolation speed also affected by volume
      const lerpSpeed = (0.03 + (volume * 0.08)) * (1.0 + config.speed * 0.2);

      const handGrip = materialRef.current?.uniforms.uHandGrip.value || 0;
      // Only lerp to shape if NOT gripping hard.
      // We still update positions for Rain if needed, but Rain is a shader displacement, 
      // so we should keep updating base positions to allow transition back.
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
      <BackgroundParticles config={config} settings={settings} getAudioData={getAudioData} accumulatedTime={accumulatedTimeRef.current} />
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" count={PARTICLE_COUNT} array={positions} itemSize={3} />
          <bufferAttribute attach="attributes-aScale" count={PARTICLE_COUNT} array={randoms} itemSize={1} />
          <bufferAttribute attach="attributes-aColorMix" count={PARTICLE_COUNT} array={colorMix} itemSize={3} />
          <bufferAttribute attach="attributes-aFlashSpeed" count={PARTICLE_COUNT} array={flashSpeeds} itemSize={1} />
          <bufferAttribute attach="attributes-aSpriteType" count={PARTICLE_COUNT} array={spriteTypes} itemSize={1} />
          <bufferAttribute attach="attributes-aIndex" count={PARTICLE_COUNT} array={indices} itemSize={1} />
        </bufferGeometry>
        <starMaterial ref={materialRef} />
      </points>
    </>
  );
};

export default VisualizerScene;