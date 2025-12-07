import React, { useRef } from 'react';
import { Play, Pause, SkipForward, SkipBack, Upload, Music, Disc } from 'lucide-react';
import { SongMetadata, VisualConfig } from '../types';

interface UIOverlayProps {
  currentSong: SongMetadata | null;
  playlist: SongMetadata[];
  isPlaying: boolean;
  visualConfig: VisualConfig;
  onUpload: (files: FileList) => void;
  onPlay: () => void;
  onNext: () => void;
  onPrev: () => void;
  onSelectSong: (index: number) => void;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  currentSong,
  playlist,
  isPlaying,
  visualConfig,
  onUpload,
  onPlay,
  onNext,
  onPrev,
  onSelectSong
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatShapeName = (s: string) => s.replace(/_/g, ' ');

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 z-10 text-white">
      
      {/* Top Bar: Title & Visual Info */}
      <div className="flex justify-between items-start pointer-events-auto">
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

      {/* Middle Right: Playlist */}
      {playlist.length > 0 && (
        <div className="absolute right-6 top-1/4 bottom-1/4 w-64 pointer-events-auto flex flex-col gap-2">
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
