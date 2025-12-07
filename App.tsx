import React, { useEffect, useState, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { useAudioVisualizer } from './hooks/useAudioVisualizer';
import { analyzeSongMood } from './services/geminiService';
import VisualizerScene from './components/VisualizerScene';
import UIOverlay from './components/UIOverlay';
import { DEFAULT_VISUAL_CONFIG } from './constants';
import { VisualConfig, VisualShape } from './types';

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

  const [visualConfig, setVisualConfig] = useState<VisualConfig>(DEFAULT_VISUAL_CONFIG);
  const [isAnalysing, setIsAnalysing] = useState(false);

  // When song changes, ask Gemini for the shape
  useEffect(() => {
    if (currentSong) {
      setIsAnalysing(true);
      // Reset to a neutral waiting state or keep previous but maybe dim it?
      // Let's keep previous shape but show loading indicator in text
      
      analyzeSongMood(currentSong.name)
        .then((config) => {
          if (config) {
            console.log("Gemini Suggestion:", config);
            setVisualConfig(config);
          } else {
             // Fallback if API fails or no key
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
      
      {/* 3D Canvas Layer */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          camera={{ position: [0, 20, 60], fov: 45 }}
          gl={{ antialias: false, powerPreference: "high-performance" }}
          dpr={[1, 2]} // Optimize for pixel ratio
        >
          <color attach="background" args={['#020205']} />
          <fog attach="fog" args={['#020205', 30, 150]} />
          
          <Suspense fallback={null}>
            <VisualizerScene config={visualConfig} getAudioData={getAudioData} />
            <EffectComposer disableNormalPass>
              <Bloom 
                luminanceThreshold={0.2} 
                mipmapBlur 
                intensity={1.5} 
                radius={0.6}
              />
            </EffectComposer>
          </Suspense>
        </Canvas>
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
        onUpload={addFiles}
        onPlay={togglePlay}
        onNext={handleNext}
        onPrev={handlePrev}
        onSelectSong={(index) => playSong(index)}
      />
      
    </div>
  );
};

export default App;
