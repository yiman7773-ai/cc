import React, { useRef, useState } from 'react';
import { Play, Pause, SkipForward, SkipBack, Upload, Music, Disc, Sliders, X } from 'lucide-react';
import { SongMetadata, VisualConfig, VisualSettings } from '../types';
import { PARTICLE_COUNT } from '../constants';

interface UIOverlayProps {
  currentSong: SongMetadata | null;
  playlist: SongMetadata[];
  isPlaying: boolean;
  visualConfig: VisualConfig;
  visualSettings: VisualSettings;
  onUpload: (files: FileList) => void;
  onPlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectSong: (index: number) => void;
  onUpdateSettings: (settings: VisualSettings) => void;
  onUpdateColors: (colors: [string, string, string]) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  currentSong,
  playlist,
  isPlaying,
  visualConfig,
  visualSettings,
  onUpload,
  onPlay,
  onNext,
  onPrev,
  onSelectSong,
  onUpdateSettings,
  onUpdateColors
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showSettings, setShowSettings] = useState(false);

  const formatShapeName = (s: string) => s.replace(/_/g, ' ');

  const handleSettingChange = (key: keyof VisualSettings, value: number) => {
      onUpdateSettings({
          ...visualSettings,
          [key]: value
      });
  };

  const handleColorChange = (index: number, value: string) => {
      const newColors = [...visualConfig.colors] as [string, string, string];
      newColors[index] = value;
      onUpdateColors(newColors);
  };

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10 text-white">
      
      {/* Top Bar: Title & Visual Info & Controls */}
      <div className="flex justify-between items-start pointer-events-auto">
        
        {/* LEFT SIDE: Controls & Info */}
        <div className="flex gap-4 items-start">
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className={`mt-1 p-2 rounded-full transition-all ${showSettings ? 'bg-white text-black' : 'bg-white/10 hover:bg-white/20 text-white'}`}
              title="Visual Settings"
            >
              <Sliders size={20} />
            </button>

            <div>
              <h1 className="text-4xl font-bold tracking-widest uppercase bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500 drop-shadow-lg" style={{ fontFamily: 'Rajdhani' }}>
                COSMOS
              </h1>
              <div className="mt-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: visualConfig.colors[2] }}></div>
                <p className="text-sm text-gray-400 font-mono tracking-wider">
                  MODE: {formatShapeName(visualConfig.shape)}
                </p>
              </div>
              <p className="text-xs text-gray-500 max-w-xs mt-1 italic opacity-80">
                "{visualConfig.description}"
              </p>
            </div>
        </div>

        {/* RIGHT SIDE: Add Music */}
        <div className="flex items-center gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 transition-all text-sm font-medium"
            >
              <Upload size={16} />
              <span>Add Music</span>
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              hidden 
              multiple 
              accept="audio/*"
              onChange={(e) => e.target.files && onUpload(e.target.files)} 
            />
        </div>
      </div>

      {/* Settings Panel - Moved to Left */}
      {showSettings && (
          <div className="absolute top-36 left-6 w-72 bg-black/80 backdrop-blur-xl border border-white/10 rounded-xl p-4 pointer-events-auto shadow-2xl animate-fade-in-down z-20">
              <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
                  <h3 className="text-sm font-bold tracking-wider text-blue-300">FINE TUNING</h3>
                  <button onClick={() => setShowSettings(false)} className="hover:text-red-400">
                      <X size={16} />
                  </button>
              </div>
              
              <div className="space-y-4">
                  <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                          <span>Particle Count</span>
                          <span>{visualSettings.particleCount.toLocaleString()}</span>
                      </div>
                      <input 
                          type="range" 
                          min="1000" 
                          max={PARTICLE_COUNT} 
                          step="1000"
                          value={visualSettings.particleCount} 
                          onChange={(e) => handleSettingChange('particleCount', parseInt(e.target.value))}
                          className="w-full accent-blue-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>

                  <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                          <span>Particle Size</span>
                          <span>{visualSettings.particleSize.toFixed(1)}</span>
                      </div>
                      <input 
                          type="range" 
                          min="0.1" 
                          max="3.0" 
                          step="0.1"
                          value={visualSettings.particleSize} 
                          onChange={(e) => handleSettingChange('particleSize', parseFloat(e.target.value))}
                          className="w-full accent-blue-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>

                  <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                          <span>Brightness</span>
                          <span>{visualSettings.brightness.toFixed(1)}</span>
                      </div>
                      <input 
                          type="range" 
                          min="0.1" 
                          max="3.0" 
                          step="0.1"
                          value={visualSettings.brightness} 
                          onChange={(e) => handleSettingChange('brightness', parseFloat(e.target.value))}
                          className="w-full accent-blue-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>
                  
                  <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                          <span>Glow (Bloom)</span>
                          <span>{visualSettings.bloomIntensity.toFixed(1)}</span>
                      </div>
                      <input 
                          type="range" 
                          min="0.0" 
                          max="4.0" 
                          step="0.1"
                          value={visualSettings.bloomIntensity} 
                          onChange={(e) => handleSettingChange('bloomIntensity', parseFloat(e.target.value))}
                          className="w-full accent-purple-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>

                  <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-400">
                          <span>Trail Flow</span>
                          <span>{visualSettings.trailStrength.toFixed(1)}</span>
                      </div>
                      <input 
                          type="range" 
                          min="0.0" 
                          max="1.0" 
                          step="0.05"
                          value={visualSettings.trailStrength} 
                          onChange={(e) => handleSettingChange('trailStrength', parseFloat(e.target.value))}
                          className="w-full accent-purple-500 h-1 bg-white/20 rounded-lg appearance-none cursor-pointer"
                      />
                  </div>
                  
                  <div className="pt-2 border-t border-white/10">
                      <span className="text-xs text-gray-400 block mb-2">Palette Overrides</span>
                      <div className="flex justify-between">
                          {visualConfig.colors.map((color, idx) => (
                              <div key={idx} className="flex flex-col items-center gap-1">
                                  <input 
                                      type="color" 
                                      value={color} 
                                      onChange={(e) => handleColorChange(idx, e.target.value)}
                                      className="w-8 h-8 rounded-full border-none p-0 cursor-pointer bg-transparent"
                                  />
                              </div>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Middle Right: Playlist */}
      {playlist.length > 0 && (
        <div className="absolute right-6 top-1/4 bottom-1/4 w-64 pointer-events-auto flex flex-col gap-2 z-0">
          <div className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-4 h-full flex flex-col overflow-hidden">
             <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">Local Playlist</h3>
             <div className="flex-1 overflow-y-auto space-y-2 pr-1">
               {playlist.map((song, idx) => (
                 <div 
                   key={song.id}
                   onClick={() => onSelectSong(idx)}
                   className={`p-2 rounded-lg cursor-pointer transition-all flex items-center gap-3 group ${
                     currentSong?.id === song.id 
                       ? 'bg-white/20 border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]' 
                       : 'hover:bg-white/5'
                   }`}
                 >
                   {currentSong?.id === song.id ? (
                      <Disc size={16} className="animate-spin text-purple-400" />
                   ) : (
                      <Music size={16} className="text-gray-600 group-hover:text-gray-400" />
                   )}
                   <div className="overflow-hidden">
                     <p className={`text-sm truncate ${currentSong?.id === song.id ? 'text-white' : 'text-gray-400'}`}>
                       {song.name}
                     </p>
                   </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}

      {/* Bottom Bar: Player Controls */}
      <div className="flex justify-center items-end pointer-events-auto">
        <div className="bg-black/60 backdrop-blur-xl border border-white/10 rounded-full px-8 py-4 flex items-center gap-8 shadow-2xl">
          
          <div className="flex flex-col min-w-[150px]">
            <span className="text-xs text-blue-300 font-bold tracking-widest">NOW PLAYING</span>
            <span className="text-white font-medium truncate max-w-[200px]">
              {currentSong ? currentSong.name : "Select a track"}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={onPrev} className="hover:text-blue-400 transition-colors">
              <SkipBack size={24} />
            </button>
            
            <button 
              onClick={onPlay}
              className="w-14 h-14 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-full flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-purple-500/30"
            >
              {isPlaying ? <Pause size={28} fill="white" /> : <Play size={28} fill="white" className="ml-1" />}
            </button>
            
            <button onClick={onNext} className="hover:text-blue-400 transition-colors">
              <SkipForward size={24} />
            </button>
          </div>

          {/* Visualization Data Mini Display */}
          <div className="flex gap-1 h-8 items-end opacity-50">
             {[...Array(5)].map((_, i) => (
                <div key={i} className="w-1 bg-white animate-pulse" style={{ height: `${20 + Math.random() * 80}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
             ))}
          </div>

        </div>
      </div>
    </div>
  );
};

export default UIOverlay;