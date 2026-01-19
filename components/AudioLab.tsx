
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AudioStem, AudioMetadata, LyricLine } from '../types';
import GuitarTuner from './GuitarTuner';

type LabModule = 'STEMS' | 'TUNER' | 'KARAOKE';
type PlaybackStatus = 'PLAYING' | 'PAUSED' | 'STOPPED';

const AudioLab: React.FC = () => {
  const [activeModule, setActiveModule] = useState<LabModule>('STEMS');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'MP3' | 'WAV' | 'SRT'>('MP3');
  const [songFile, setSongFile] = useState<File | null>(null);
  
  // Playback System
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('STOPPED');
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100
  const playbackTimerRef = useRef<number | null>(null);

  const [stems, setStems] = useState<AudioStem[]>([]);
  const [soloedId, setSoloedId] = useState<string | null>(null);
  const [isVocalReference, setIsVocalReference] = useState(false);
  
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Zoom and Pan States
  const [zoom, setZoom] = useState(1);
  const waveformContainerRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulation parameters
  const trackDuration = 180; // Simulated 3 minute track

  const masterWaveformData = useMemo(() => {
    return Array.from({ length: 500 }, () => Math.random() * 0.8 + 0.1);
  }, [songFile]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [processingLog]);

  // Playback Logic
  useEffect(() => {
    if (playbackStatus === 'PLAYING') {
      const startTime = Date.now() - (playbackProgress / 100) * (trackDuration * 1000 / playbackSpeed);
      
      const update = () => {
        const elapsed = Date.now() - startTime;
        const newProgress = (elapsed / (trackDuration * 1000 / playbackSpeed)) * 100;
        
        if (newProgress >= 100) {
          setPlaybackProgress(0);
          setPlaybackStatus('STOPPED');
        } else {
          setPlaybackProgress(newProgress);
          playbackTimerRef.current = requestAnimationFrame(update);
        }
      };
      
      playbackTimerRef.current = requestAnimationFrame(update);
    } else {
      if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
    }
    
    return () => {
      if (playbackTimerRef.current) cancelAnimationFrame(playbackTimerRef.current);
    };
  }, [playbackStatus, playbackSpeed, playbackProgress]);

  const togglePlayback = () => {
    setPlaybackStatus(prev => prev === 'PLAYING' ? 'PAUSED' : 'PLAYING');
  };

  const stopPlayback = () => {
    setPlaybackStatus('STOPPED');
    setPlaybackProgress(0);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!waveformContainerRef.current || isProcessing) return;
    const rect = waveformContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + waveformContainerRef.current.scrollLeft;
    const totalWidth = waveformContainerRef.current.scrollWidth;
    const seekPercentage = (clickX / totalWidth) * 100;
    setPlaybackProgress(Math.max(0, Math.min(100, seekPercentage)));
    if (playbackStatus === 'STOPPED') setPlaybackStatus('PAUSED');
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    setProcessingLog([]);
    setError(null);
    
    const statuses = [
      "Initializing Neural Core...",
      "Decomposing Spectral Latency...",
      "Isolating Vocal Stems (Whisper V3)...",
      "Transcribing Lexical Cues...",
      "Generating Karaoke Sync Markers...",
      "Mapping Harmonic Flux...",
      "Finalizing Karaoke Package..."
    ];

    let lastLogIndex = -1;
    const interval = setInterval(() => {
      setProcessingProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          finishProcessing();
          return 100;
        }
        const logIndex = Math.floor(prev / (100 / statuses.length));
        if (logIndex !== lastLogIndex && logIndex < statuses.length) {
          const newStatus = statuses[logIndex];
          setProcessingStatus(newStatus);
          setProcessingLog(cur => [...cur, `[SYSTEM] ${newStatus}`]);
          lastLogIndex = logIndex;
        }
        return prev + 1;
      });
    }, 30);
  };

  const finishProcessing = () => {
    setMetadata({ 
      bpm: 124, 
      key: 'Bm',
      chords: ['Bm', 'G', 'D', 'A', 'Em7', 'F#m'],
      lyrics: [
        { time: 5, text: "Welcome to the Virtual Sonics experience" },
        { time: 10, text: "Neural separation in the palm of your hand" },
        { time: 15, text: "Isolate the voice, feel the rhythm" },
        { time: 20, text: "Whisper transcribing every word you say" },
        { time: 25, text: "This is the future of audio architecture" },
        { time: 30, text: "Break it down, build it up again" },
        { time: 40, text: "[Guitar Solo - Neural Reconstruction Active]" },
        { time: 55, text: "Can you hear the layers? Pure isolation." },
      ]
    });
    setStems([
      { id: '1', name: 'Vocals', volume: 100, muted: false, color: 'emerald-400' },
      { id: '2', name: 'Instruments', volume: 90, muted: false, color: 'blue-400' },
      { id: '3', name: 'Drums', volume: 80, muted: false, color: 'amber-400' },
      { id: '4', name: 'Bass', volume: 75, muted: false, color: 'purple-400' },
    ]);
    setIsProcessing(false);
  };

  const currentLyric = useMemo(() => {
    if (!metadata?.lyrics) return null;
    const currentTime = (playbackProgress / 100) * trackDuration;
    return [...metadata.lyrics].reverse().find(l => l.time <= currentTime);
  }, [metadata, playbackProgress]);

  const toggleVocalReference = () => {
    const newVal = !isVocalReference;
    setIsVocalReference(newVal);
    setStems(stems.map(s => s.name === 'Vocals' ? { ...s, volume: newVal ? 30 : 0 } : s));
  };

  const isStemActive = (stem: AudioStem) => {
    if (soloedId) return soloedId === stem.id;
    return !stem.muted;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700 pb-20">
      <section className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div>
            <h2 className="text-5xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-white to-white/40 bg-clip-text text-transparent">Audio Lab</h2>
            <p className="text-white/40 mt-2 max-w-xl font-medium uppercase text-[10px] mono tracking-[0.2em]">Neural Processing • Stem Isolation • Karaoke Engine</p>
          </div>
          
          <div className="flex items-center gap-2 p-1.5 bg-white/5 border border-white/10 rounded-2xl">
             {(['STEMS', 'KARAOKE', 'TUNER'] as LabModule[]).map((m) => (
                <button 
                  key={m}
                  onClick={() => setActiveModule(m)}
                  className={`px-6 py-2.5 text-[10px] mono uppercase font-bold rounded-xl transition-all ${activeModule === m ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40 hover:text-white'}`}
                >
                  {m.replace('_', ' ')}
                </button>
             ))}
          </div>
        </div>

        {!songFile ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="group h-[500px] border-2 border-dashed border-white/5 bg-white/[0.02] rounded-[3rem] flex flex-col items-center justify-center gap-6 cursor-pointer hover:bg-white/[0.04] hover:border-white/20 transition-all duration-700 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 group-hover:bg-white/10 transition-all duration-500 relative z-10">
              <span className="text-4xl text-white/20 group-hover:text-white/60 transition-colors">↑</span>
            </div>
            <div className="text-center space-y-2 relative z-10">
              <p className="text-2xl font-bold tracking-tight">Drop Audio for Multi-Track Analysis</p>
              <p className="text-white/40 mono text-xs uppercase tracking-widest italic">Supports AI Isolation & Transcribe</p>
            </div>
            <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setSongFile(file); simulateProcessing(); }
            }} accept="audio/*" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* MIXER & CONTROL PANEL */}
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-8">
                <div className="flex justify-between items-center text-[10px] mono text-white/40 uppercase">
                  <span>Track ID</span>
                  <button onClick={() => { setSongFile(null); setStems([]); setMetadata(null); }} className="text-red-400 hover:text-red-300">Reset</button>
                </div>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-lg">♫</div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-bold truncate">{songFile.name}</p>
                    <p className="text-[9px] text-white/20 mono uppercase">Active Pipeline</p>
                  </div>
                </div>

                {metadata && (
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                      <p className="text-[8px] mono text-white/30 uppercase">BPM</p>
                      <p className="text-2xl font-black text-blue-400">{metadata.bpm}</p>
                    </div>
                    <div className="p-4 bg-black/40 rounded-xl border border-white/5">
                      <p className="text-[8px] mono text-white/30 uppercase">KEY</p>
                      <p className="text-2xl font-black text-emerald-400">{metadata.key}</p>
                    </div>
                  </div>
                )}

                <div className="space-y-6 pt-4 border-t border-white/5">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] mono text-white/40">
                      <span>Neural Pitch</span>
                      <span>{pitch} ST</span>
                    </div>
                    <input type="range" min="-12" max="12" value={pitch} onChange={(e) => setPitch(parseInt(e.target.value))} className="w-full accent-white" />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] mono text-white/40">
                      <span>Speed Scale</span>
                      <span>{playbackSpeed}x</span>
                    </div>
                    <input type="range" min="0.5" max="2" step="0.1" value={playbackSpeed} onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))} className="w-full accent-white" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex p-1.5 bg-white/5 border border-white/10 rounded-2xl">
                   {(['MP3', 'WAV', 'SRT'] as const).map(f => (
                     <button key={f} onClick={() => setExportFormat(f)} className={`flex-1 py-3 text-[10px] mono font-bold rounded-xl ${exportFormat === f ? 'bg-white text-black' : 'text-white/40'}`}>{f}</button>
                   ))}
                </div>
                <button className="w-full py-5 bg-white text-black font-black uppercase tracking-widest text-[10px] rounded-2xl hover:opacity-90">Export {exportFormat} Asset</button>
              </div>
            </div>

            {/* MAIN INTERACTIVE VIEW */}
            <div className="lg:col-span-9 space-y-6">
              {/* WAVEFORM & PLAYBACK */}
              <div className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] relative overflow-hidden group">
                <div className="flex justify-between items-center mb-8 relative z-10">
                  <div className="flex items-center gap-4">
                    <div className="flex gap-2">
                      <button onClick={togglePlayback} className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${playbackStatus === 'PLAYING' ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
                        {playbackStatus === 'PLAYING' ? '||' : '▶'}
                      </button>
                      <button onClick={stopPlayback} className="w-12 h-12 rounded-full bg-white/10 text-white flex items-center justify-center border border-white/10">■</button>
                    </div>
                    <div className="mono text-[10px] text-white/40 uppercase">
                      {Math.floor((playbackProgress / 100) * trackDuration / 60)}:{Math.floor(((playbackProgress / 100) * trackDuration) % 60).toString().padStart(2, '0')} 
                      <span className="mx-2">/</span>
                      03:00
                    </div>
                  </div>
                  
                  {activeModule === 'KARAOKE' && (
                    <button 
                      onClick={toggleVocalReference}
                      className={`px-4 py-2 rounded-xl text-[9px] mono uppercase font-bold border transition-all ${isVocalReference ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' : 'bg-white/5 border-white/10 text-white/40'}`}
                    >
                      {isVocalReference ? 'Vocal Ref: ON' : 'Vocal Ref: OFF'}
                    </button>
                  )}
                </div>

                <div 
                  ref={waveformContainerRef}
                  onClick={handleSeek}
                  className="relative h-48 bg-black/40 border border-white/5 rounded-2xl flex items-center overflow-x-auto overflow-y-hidden cursor-crosshair custom-scrollbar-hidden select-none"
                >
                  <div className="flex items-center gap-[2px] h-32 px-8" style={{ width: `${100 * zoom}%`, minWidth: '100%' }}>
                    {masterWaveformData.map((val, i) => {
                      const past = (i / masterWaveformData.length) * 100 < playbackProgress;
                      return (
                        <div key={i} className={`flex-1 min-w-[1px] rounded-full transition-all ${isProcessing ? 'opacity-5 bg-white scale-y-20' : past ? 'bg-emerald-400 opacity-80' : 'bg-white opacity-20'}`} style={{ height: `${val * 100}%` }} />
                      );
                    })}
                  </div>
                  {!isProcessing && <div className="absolute top-0 bottom-0 w-[2px] bg-emerald-400 shadow-[0_0_15px_emerald] z-20 pointer-events-none" style={{ left: `calc(${playbackProgress}% + 32px)` }} />}
                  
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-2xl flex flex-col items-center justify-center z-30 p-10 space-y-6">
                      <div className="w-full max-w-lg space-y-4">
                        <div className="flex justify-between text-[10px] mono uppercase text-white/60">
                          <span>{processingStatus}</span>
                          <span>{processingProgress}%</span>
                        </div>
                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                          <div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500" style={{ width: `${processingProgress}%` }} />
                        </div>
                        <div className="h-24 bg-black/40 rounded-xl border border-white/5 p-4 overflow-hidden font-mono text-[9px] text-emerald-500/80">
                           {processingLog.map((log, i) => <div key={i} className="animate-in fade-in slide-in-from-left-2">{log}</div>)}
                           <div ref={logEndRef} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* MODULE CONTENT */}
              {activeModule === 'KARAOKE' ? (
                <div className="bg-black border border-white/10 rounded-[2.5rem] p-12 min-h-[400px] flex flex-col items-center justify-center text-center space-y-8 relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
                  
                  <div className="space-y-4 max-w-2xl">
                    <p className="text-[10px] mono text-white/20 uppercase tracking-[0.4em]">Neural Whisper Pipeline</p>
                    <div className="relative min-h-[120px] flex items-center justify-center">
                      <h4 className={`text-6xl font-black italic tracking-tighter transition-all duration-500 ${playbackStatus === 'PLAYING' ? 'text-white scale-100 opacity-100' : 'text-white/10 scale-95 opacity-50'}`}>
                        {currentLyric ? currentLyric.text : "..."}
                      </h4>
                    </div>
                    {currentLyric && (
                      <p className="text-emerald-400/40 text-xs mono animate-pulse">
                        [SYNCED {Math.floor(currentLyric.time)}s]
                      </p>
                    )}
                  </div>

                  <div className="w-full pt-12 border-t border-white/5 flex gap-12 justify-center">
                     <div className="text-center space-y-2">
                        <p className="text-[9px] mono text-white/20 uppercase">Confidence</p>
                        <p className="text-xl font-bold text-white/60">99.8%</p>
                     </div>
                     <div className="text-center space-y-2">
                        <p className="text-[9px] mono text-white/20 uppercase">Latent Delay</p>
                        <p className="text-xl font-bold text-white/60">12ms</p>
                     </div>
                     <div className="text-center space-y-2">
                        <p className="text-[9px] mono text-white/20 uppercase">Translation</p>
                        <p className="text-xl font-bold text-white/60">Auto (EN)</p>
                     </div>
                  </div>
                </div>
              ) : activeModule === 'STEMS' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {stems.map((stem) => {
                    const active = isStemActive(stem);
                    const isVisualActive = active && playbackStatus === 'PLAYING';
                    return (
                      <div key={stem.id} className={`p-6 rounded-3xl border transition-all duration-500 flex flex-col gap-6 ${active ? 'bg-white/[0.04] border-white/10' : 'bg-black/20 border-white/5 opacity-40'}`}>
                        <div className="flex justify-between items-start">
                          <div className="space-y-1">
                            <p className="text-sm font-black uppercase italic tracking-tight">{stem.name}</p>
                            <div className={`text-[9px] mono uppercase font-bold text-${stem.color}`}>CH-{stem.id}</div>
                          </div>
                          <div className="flex gap-1">
                            <button onClick={() => setSoloedId(soloedId === stem.id ? null : stem.id)} className={`w-7 h-7 rounded-lg text-[9px] mono font-black border ${soloedId === stem.id ? 'bg-amber-400 border-amber-400 text-black' : 'bg-black/40 border-white/5 text-white/40'}`}>S</button>
                            <button onClick={() => setStems(stems.map(s => s.id === stem.id ? { ...s, muted: !s.muted } : s))} className={`w-7 h-7 rounded-lg text-[9px] mono font-black border ${stem.muted ? 'bg-red-500 border-red-500 text-white' : 'bg-black/40 border-white/5 text-white/40'}`}>M</button>
                          </div>
                        </div>
                        <div className="flex-1 h-32 relative bg-black/40 rounded-2xl flex items-center px-3 overflow-hidden">
                          <div className="flex items-end justify-center gap-[2px] w-full h-16">
                            {Array.from({length: 12}).map((_, i) => (
                              <div key={i} className={`w-1 rounded-full bg-${stem.color} transition-all`} style={{ height: `${isVisualActive ? (Math.random() * 80 + 20) : 5}%`, opacity: active ? 0.6 : 0.05 }} />
                            ))}
                          </div>
                        </div>
                        <div className="space-y-3">
                          <div className="flex justify-between text-[9px] mono text-white/40">
                            <span>Gain</span>
                            <span>{stem.volume}%</span>
                          </div>
                          <input type="range" min="0" max="100" value={stem.volume} onChange={(e) => setStems(stems.map(s => s.id === stem.id ? { ...s, volume: parseInt(e.target.value) } : s))} className={`w-full h-1 bg-white/5 accent-${stem.color}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <GuitarTuner />
              )}
            </div>
          </div>
        )}
      </section>

      <style>{`
        input[type='range'] {
          -webkit-appearance: none;
          background: rgba(255,255,255,0.05);
          height: 4px;
          border-radius: 2px;
        }
        input[type='range']::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          background: white;
          border-radius: 50%;
          cursor: pointer;
        }
        .custom-scrollbar-hidden::-webkit-scrollbar { display: none; }
        .custom-scrollbar-hidden { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default AudioLab;
