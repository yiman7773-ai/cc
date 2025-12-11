import { useEffect, useRef, useState } from 'react';
import { HandLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { GestureState } from '../types';

export const useHandTracking = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const gestureStateRef = useRef<GestureState>({
    leftHand: { active: false, isFist: false, strength: 0 },
    rightHand: { active: false, x: 0, y: 0, gesture: 'NONE' }
  });
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let handLandmarker: HandLandmarker | null = null;
    let animationFrameId: number;

    const setupMediaPipe = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm"
        );
        
        handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task`,
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 2
        });

        startCamera();
      } catch (error) {
        console.error("Error initializing MediaPipe:", error);
      }
    };

    const startCamera = async () => {
      if (videoRef.current && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: 640, 
              height: 480,
              frameRate: { ideal: 30 }
            } 
          });
          videoRef.current.srcObject = stream;
          videoRef.current.addEventListener('loadeddata', predictWebcam);
          setIsReady(true);
        } catch (err) {
          console.error("Error accessing webcam:", err);
        }
      }
    };

    const predictWebcam = () => {
      if (videoRef.current && handLandmarker && videoRef.current.readyState >= 2) {
        const results = handLandmarker.detectForVideo(videoRef.current, performance.now());
        
        // Reset state
        const newState: GestureState = {
          leftHand: { active: false, isFist: false, strength: 0 },
          rightHand: { active: false, x: 0, y: 0, gesture: 'NONE' }
        };

        if (results.landmarks) {
          for (let i = 0; i < results.landmarks.length; i++) {
            const landmarks = results.landmarks[i];
            const handedness = results.handedness[i][0].categoryName; 
            
            // Note: MediaPipe "Left" is the person's left hand. 
            // In a mirrored webcam view, "Left" hand appears on the right side of the screen.
            
            if (handedness === 'Left') {
              // LEFT HAND -> CONTROL (Contract / Explode)
              newState.leftHand.active = true;
              
              // Simple gesture detection: Distance between wrist(0) and Middle Tip(12)
              const wrist = landmarks[0];
              const middleTip = landmarks[12];
              const distance = Math.sqrt(
                Math.pow(wrist.x - middleTip.x, 2) + 
                Math.pow(wrist.y - middleTip.y, 2)
              );
              
              // Thresholds based on normalized coordinates
              // < 0.25 usually closed, > 0.4 usually open
              const isFist = distance < 0.25;
              
              newState.leftHand.isFist = isFist;
              newState.leftHand.strength = isFist 
                 ? Math.max(0, (0.3 - distance) * 5) // Strength of grip
                 : Math.min(1, (distance - 0.3) * 2); // Strength of spread
                 
            } else if (handedness === 'Right') {
              // RIGHT HAND -> INTERACTION (Touch/Ripple OR Rain)
              newState.rightHand.active = true;
              const indexTip = landmarks[8];
              
              // Map 0..1 to -1..1 for 3D space
              // Video is typically mirrored in CSS, so X needs inversion if not already
              newState.rightHand.x = (indexTip.x - 0.5) * 2; 
              newState.rightHand.y = -(indexTip.y - 0.5) * 2; // Invert Y for 3D

              // Gesture Detection: Open Palm = RAIN, Point/Other = TOUCH
              const isFingerExtended = (tipIdx: number, baseIdx: number) => {
                 const tip = landmarks[tipIdx];
                 const base = landmarks[baseIdx];
                 const wrist = landmarks[0];
                 const dTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
                 const dBase = Math.hypot(base.x - wrist.x, base.y - wrist.y);
                 return dTip > dBase * 1.1; 
              };

              // Check 4 fingers (Index 8, Middle 12, Ring 16, Pinky 20)
              const indexExt = isFingerExtended(8, 5);
              const middleExt = isFingerExtended(12, 9);
              const ringExt = isFingerExtended(16, 13);
              const pinkyExt = isFingerExtended(20, 17);

              if (indexExt && middleExt && ringExt && pinkyExt) {
                 newState.rightHand.gesture = 'RAIN';
              } else {
                 newState.rightHand.gesture = 'TOUCH';
              }
            }
          }
        }
        
        // Update ref without triggering re-renders
        gestureStateRef.current = newState;
        
        animationFrameId = window.requestAnimationFrame(predictWebcam);
      }
    };

    setupMediaPipe();

    return () => {
      if (animationFrameId) window.cancelAnimationFrame(animationFrameId);
      if (handLandmarker) handLandmarker.close();
      if (videoRef.current && videoRef.current.srcObject) {
         const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
         tracks.forEach(track => track.stop());
      }
    };
  }, []);

  return { videoRef, gestureStateRef, isReady };
};