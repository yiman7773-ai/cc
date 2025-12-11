import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useAudioVisualizer } from './hooks/useAudioVisualizer';
import { useHandTracking } from './hooks/useHandTracking';
import { analyzeSongMood } from './services/geminiService';
import VisualizerScene from './components/VisualizerScene';
import UIOverlay from './components/UIOverlay';
import { DEFAULT_VISUAL_CONFIG, DEFAULT_VISUAL_SETTINGS } from './constants';
import { VisualConfig, VisualShape, VisualSettings } from './types';

const App: React.FC = () => {
  const { 
    playlist, 
    currentSong, 
    isPlaying, 
    addFiles, 
    playSong, 
    togglePlay, 
    handleNext, 
    handlePrev, 
    getAudioData
  } = useAudioVisualizer();

  const { videoRef, gestureStateRef, isReady: isHandTrackingReady } = useHandTracking();

  const [visualConfig, setVisualConfig] = useState<VisualConfig>(DEFAULT_VISUAL_CONFIG);
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(DEFAULT_VISUAL_SETTINGS);
  const [isAnalysing, setIsAnalysing] = useState(false);

  useEffect(() => {
    if (currentSong) {
      setIsAnalysing(true);
      analyzeSongMood(currentSong.name)
        .then((config) => {
          if (config) {
            setVisualConfig(config);
          } else {
             setVisualConfig({
                 ...DEFAULT_VISUAL_CONFIG,
                 shape: Object.values(VisualShape)[Math.floor(Math.random() * Object.values(VisualShape).length)] as VisualShape,
                 description: "AI Offline - Random Gen"
             });
          }
        })
        .finally(() => setIsAnalysing(false));
    }
  }, [currentSong]);

  return (
    <div className="relative w-full h-screen bg-black">
      
      {/* Hidden Video Element for Hand Tracking */}
      <video 
        ref={videoRef} 
        className="absolute top-0 left-0 opacity-0 pointer-events-none z-[-1]" 
        autoPlay 
        playsInline 
        muted 
        style={{ transform: 'scaleX(-1)' }} // Mirroring is handled in CSS for visual, but logic handles raw data
      />

      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          camera={{ position: [0, 0, 100], fov: 45 }}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          dpr={[1, 2]} 
        >
          <color attach="background" args={['#020205']} />
          <fog attach="fog" args={['#020205', 30, 150]} />
          
          <Suspense fallback={null}>
            <VisualizerScene 
              config={visualConfig} 
              settings={visualSettings}
              getAudioData={getAudioData} 
              gestureRef={gestureStateRef}
            />
            <EffectComposer disableNormalPass>
              <Bloom 
                luminanceThreshold={0.2} 
                mipmapBlur 
                intensity={visualSettings.bloomIntensity} 
                radius={0.6}
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
      </div>

      {/* Hand Tracking Status Indicator (Top Right, Small) */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end pointer-events-none">
         <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border ${isHandTrackingReady ? 'bg-green-900/50 border-green-500/30 text-green-400' : 'bg-red-900/50 border-red-500/30 text-red-400'}`}>
            <div className={`w-2 h-2 rounded-full ${isHandTrackingReady ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            {isHandTrackingReady ? "HAND TRACKING ACTIVE" : "INIT CAMERA..."}
         </div>
      </div>

      {/* UI Layer */}
      <UIOverlay 
        currentSong={currentSong}
        playlist={playlist}
        isPlaying={isPlaying}
        visualConfig={{
             ...visualConfig, 
             description: isAnalysing ? "Consulting the stars..." : visualConfig.description 
        }}
        visualSettings={visualSettings}
        onUpload={addFiles}
        onPlay={togglePlay}
        onNext={handleNext}
        onPrev={handlePrev}
        onSelectSong={(index) => playSong(index)}
        onUpdateSettings={setVisualSettings}
        onUpdateColors={(colors) => setVisualConfig(prev => ({ ...prev, colors }))}
      />
      
    </div>
  );
};

export default App;