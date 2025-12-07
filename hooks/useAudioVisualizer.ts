import { useState, useRef, useEffect, useCallback } from 'react';
import { SongMetadata, AudioData } from '../types';
import { ANALYSER_FFT_SIZE } from '../constants';

export const useAudioVisualizer = () => {
    const [playlist, setPlaylist] = useState<SongMetadata[]>([]);
    const [currentSongIndex, setCurrentSongIndex] = useState<number>(-1);
    const [isPlaying, setIsPlaying] = useState(false);
    
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    
    const dataArrayRef = useRef<Uint8Array>(new Uint8Array(ANALYSER_FFT_SIZE / 2));

    useEffect(() => {
        // Init Audio Element
        const audio = new Audio();
        audio.crossOrigin = "anonymous";
        audioRef.current = audio;

        audio.addEventListener('ended', handleNext);

        return () => {
            audio.removeEventListener('ended', handleNext);
            audio.pause();
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initAudioContext = () => {
        if (!audioContextRef.current) {
            const Ctx = window.AudioContext || (window as any).webkitAudioContext;
            audioContextRef.current = new Ctx();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = ANALYSER_FFT_SIZE;
            
            if (audioRef.current) {
                sourceRef.current = audioContextRef.current.createMediaElementSource(audioRef.current);
                sourceRef.current.connect(analyserRef.current);
                analyserRef.current.connect(audioContextRef.current.destination);
            }
        } else if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume();
        }
    };

    const addFiles = useCallback((files: FileList) => {
        const newSongs: SongMetadata[] = Array.from(files).filter(f => f.type.startsWith('audio/')).map(f => ({
            id: Math.random().toString(36).substring(7),
            file: f,
            name: f.name.replace(/\.[^/.]+$/, ""),
            duration: 0
        }));
        
        setPlaylist(prev => {
             const updated = [...prev, ...newSongs];
             // If first upload, auto play first song
             if (prev.length === 0 && newSongs.length > 0) {
                 // Defer slightly to allow state update
                 setTimeout(() => playSong(0, updated), 100);
             }
             return updated;
        });
    }, []);

    const playSong = async (index: number, currentList = playlist) => {
        if (!audioRef.current || index < 0 || index >= currentList.length) return;
        
        initAudioContext();
        
        const song = currentList[index];
        const url = URL.createObjectURL(song.file);
        
        audioRef.current.src = url;
        try {
            await audioRef.current.play();
            setCurrentSongIndex(index);
            setIsPlaying(true);
        } catch (err) {
            console.error("Playback failed", err);
        }
    };

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            initAudioContext();
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleNext = () => {
        if (playlist.length === 0) return;
        const nextIndex = (currentSongIndex + 1) % playlist.length;
        playSong(nextIndex);
    };

    const handlePrev = () => {
        if (playlist.length === 0) return;
        const prevIndex = (currentSongIndex - 1 + playlist.length) % playlist.length;
        playSong(prevIndex);
    };

    const getAudioData = (): AudioData => {
        if (analyserRef.current) {
            analyserRef.current.getByteFrequencyData(dataArrayRef.current);
            
            // Calc average
            let sum = 0;
            for(let i=0; i<dataArrayRef.current.length; i++) {
                sum += dataArrayRef.current[i];
            }
            const avg = sum / dataArrayRef.current.length;
            
            return {
                frequencyData: dataArrayRef.current,
                averageFrequency: avg
            };
        }
        return { frequencyData: new Uint8Array(0), averageFrequency: 0 };
    };

    return {
        playlist,
        currentSong: currentSongIndex >= 0 ? playlist[currentSongIndex] : null,
        isPlaying,
        addFiles,
        playSong,
        togglePlay,
        handleNext,
        handlePrev,
        getAudioData
    };
};
