
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AudioStem, AudioMetadata, LyricLine } from '../types';
import { GoogleGenAI } from '@google/genai';
import GuitarTuner from './GuitarTuner';

type LabModule = 'DAW' | 'TUNER' | 'KARAOKE' | 'GENERATOR' | 'EXPLORER';
type PlaybackStatus = 'PLAYING' | 'PAUSED' | 'STOPPED';

const AudioLab: React.FC = () => {
  const [activeModule, setActiveModule] = useState<LabModule>('DAW');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingStatus, setProcessingStatus] = useState('');
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'MP3' | 'WAV' | 'SRT'>('MP3');
  const [songFile, setSongFile] = useState<File | null>(null);
  const [isProjectGenerated, setIsProjectGenerated] = useState(false);
  
  // Generator & Explorer States
  const [genGenre, setGenGenre] = useState('Cyber-Synth');
  const [genMood, setGenMood] = useState('Cinematic');
  const [genInstruments, setGenInstruments] = useState('Synthesizers, Industrial Drums, Pulsing Bass');
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [remapGenre, setRemapGenre] = useState('Dark Jazz');
  const [remapMood, setRemapMood] = useState('Noir');
  const [isRemapping, setIsRemapping] = useState(false);

  // Playback System
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('STOPPED');
  const [playbackProgress, setPlaybackProgress] = useState(0); // 0 to 100
  const playbackTimerRef = useRef<number | null>(null);

  const [stems, setStems] = useState<AudioStem[]>([]);
  const [soloedIds, setSoloedIds] = useState<string[]>([]);
  const [isVocalReference, setIsVocalReference] = useState(false);
  
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [isolationThreshold, setIsolationThreshold] = useState(75); // 0 to 100
  const [zoom, setZoom] = useState(1.5);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  const timelineRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trackDuration = 180; // Simulated 3 minute track

  // Simulated waveform data for each stem
  const stemWaveforms = useMemo(() => {
    return stems.map(() => Array.from({ length: 300 }, () => Math.random() * 0.7 + 0.1));
  }, [stems.length, songFile, isProjectGenerated]);

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

  const jumpToTime = (time: number) => {
    if (isProcessing) return;
    const newProgress = (time / trackDuration) * 100;
    setPlaybackProgress(Math.max(0, Math.min(100, newProgress)));
    if (playbackStatus === 'STOPPED') setPlaybackStatus('PAUSED');
  };

  const handleTimelineSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current || isProcessing) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left + timelineRef.current.scrollLeft;
    const totalWidth = timelineRef.current.scrollWidth;
    const seekPercentage = (clickX / totalWidth) * 100;
    jumpToTime((seekPercentage / 100) * trackDuration);
  };

  const saveProjectToLocal = () => {
    if (!songFile) return;
    const projectState = {
      stems,
      soloedIds,
      metadata,
      playbackSpeed,
      pitch,
      isolationThreshold,
      isProjectGenerated,
      songFileName: songFile.name,
      timestamp: Date.now()
    };
    localStorage.setItem('vs_project_cache', JSON.stringify(projectState));
    setProcessingLog(prev => [...prev, `[STORAGE] State captured to local node.`]);
  };

  const loadProjectFromLocal = () => {
    const saved = localStorage.getItem('vs_project_cache');
    if (saved) {
      try {
        const state = JSON.parse(saved);
        setStems(state.stems);
        setSoloedIds(state.soloedIds || []);
        setMetadata(state.metadata);
        setPlaybackSpeed(state.playbackSpeed);
        setPitch(state.pitch);
        setIsolationThreshold(state.isolationThreshold);
        setIsProjectGenerated(state.isProjectGenerated);
        setSongFile({ name: state.songFileName } as File);
        setActiveModule('DAW');
      } catch (err) {
        console.error("Restore failed", err);
      }
    }
  };

  const handleNeuralRemap = async () => {
    if (!metadata || !stems.length) return;
    setIsRemapping(true);
    setProcessingProgress(0);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Neural Remix Engineer: Remap "${metadata.lyrics?.map(l => l.text).join(' ')}" to ${remapGenre}/${remapMood}. Return JSON: { "newBpm": number, "newKey": string, "newStems": string[] }.`;
      const response = await ai.models.generateContent({ model: 'gemini-3-flash-preview', contents: prompt, config: { responseMimeType: "application/json" } });
      const data = JSON.parse(response.text || '{}');
      setMetadata(prev => prev ? ({ ...prev, bpm: data.newBpm || prev.bpm, key: data.newKey || prev.key }) : null);
      const newStems: AudioStem[] = [
        stems.find(s => s.name.includes('Vocals')) || stems[0],
        ...(data.newStems || []).map((name: string, i: number) => ({ id: (i + 2).toString(), name, volume: 80, muted: false, color: ['blue-400', 'amber-400', 'purple-400'][i % 3] }))
      ];
      setStems(newStems);
      setSoloedIds([]);
      setActiveModule('DAW');
    } catch (err) { console.error(err); } finally { setIsRemapping(false); }
  };

  const handleGenerateAISong = async () => {
    setIsGenerating(true);
    setProcessingProgress(0);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `AI Music Producer: Genre: ${genGenre}, Mood: ${genMood}, Instruments: ${genInstruments}. Return JSON with track title, BPM, Key, and 6 lines of lyrics.`,
        config: { responseMimeType: "application/json" }
      });
      const data = JSON.parse(response.text || '{}');
      setMetadata({
        bpm: data.bpm || 120, key: data.key || 'Cmaj', chords: ['C', 'G', 'Am', 'F'],
        lyrics: (data.lyrics || []).map((text: string, i: number) => ({ time: i * 8 + 4, text }))
      });
      const instrumentList = genInstruments.split(',').map(s => s.trim());
      setStems([
        { id: '1', name: 'Neural Vocals', volume: 80, muted: false, color: 'emerald-400' },
        { id: '2', name: instrumentList[0] || 'Lead Synth', volume: 90, muted: false, color: 'blue-400' },
        { id: '3', name: instrumentList[1] || 'Drum Kit', volume: 85, muted: false, color: 'amber-400' },
        { id: '4', name: instrumentList[2] || 'Sub Bass', volume: 75, muted: false, color: 'purple-400' },
      ]);
      setSoloedIds([]);
      setIsProjectGenerated(true);
      setSongFile({ name: `${data.title || 'AI_GENERATED'}.vsonic` } as File);
      setActiveModule('DAW');
    } catch (err) { console.error(err); } finally { setIsGenerating(false); }
  };

  const simulateProcessing = () => {
    setIsProcessing(true);
    setProcessingProgress(0);
    let p = 0;
    const interval = setInterval(() => {
      p += 2;
      setProcessingProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        finishProcessing();
      }
    }, 40);
  };

  const finishProcessing = () => {
    setMetadata({ 
      bpm: 124, key: 'Bm', chords: ['Bm', 'G', 'D', 'A'],
      lyrics: [
        { time: 5, text: "Spectral isolation complete" },
        { time: 12, text: "Multitrack reconstruction active" },
        { time: 20, text: "Feel the neural resonance" },
        { time: 28, text: "Breaking down the signal path" },
      ]
    });
    setStems([
      { id: '1', name: 'Isolated Vocals', volume: 0, muted: false, color: 'emerald-400' },
      { id: '2', name: 'Guitars / Keys', volume: 90, muted: false, color: 'blue-400' },
      { id: '3', name: 'Percussion', volume: 80, muted: false, color: 'amber-400' },
      { id: '4', name: 'Bass Line', volume: 75, muted: false, color: 'purple-400' },
    ]);
    setSoloedIds([]);
    setIsProcessing(false);
  };

  const isStemActive = (stem: AudioStem) => {
    if (soloedIds.length > 0) return soloedIds.includes(stem.id);
    return !stem.muted;
  };

  const currentLyricIndex = useMemo(() => {
    if (!metadata?.lyrics) return -1;
    const time = (playbackProgress / 100) * trackDuration;
    return metadata.lyrics.findIndex((l, i) => l.time <= time && (metadata.lyrics![i+1]?.time > time || i === metadata.lyrics!.length - 1));
  }, [metadata, playbackProgress]);

  return (
    <div className="max-w-7xl mx-auto space-y-6 h-full flex flex-col pb-10">
      {/* DAW MASTER BAR */}
      <div className="flex items-center justify-between bg-white/[0.03] border border-white/10 rounded-2xl p-4 px-8 sticky top-0 z-50 backdrop-blur-xl">
        <div className="flex items-center gap-8">
          <div className="flex gap-1.5">
            <button onClick={togglePlayback} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${playbackStatus === 'PLAYING' ? 'bg-red-500 text-white' : 'bg-white text-black'}`}>
              {playbackStatus === 'PLAYING' ? '||' : '▶'}
            </button>
            <button onClick={stopPlayback} className="w-10 h-10 rounded-full bg-white/5 text-white flex items-center justify-center border border-white/10">■</button>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-center">
              <p className="text-[8px] mono text-white/30 uppercase">Time</p>
              <p className="text-sm mono font-bold">
                {Math.floor(((playbackProgress / 100) * trackDuration) / 60)}:
                {Math.floor(((playbackProgress / 100) * trackDuration) % 60).toString().padStart(2, '0')}
              </p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[8px] mono text-white/30 uppercase">Tempo</p>
              <p className="text-sm mono font-bold text-blue-400">{metadata?.bpm || '--'}</p>
            </div>
            <div className="h-6 w-px bg-white/10" />
            <div className="text-center">
              <p className="text-[8px] mono text-white/30 uppercase">Key</p>
              <p className="text-sm mono font-bold text-emerald-400">{metadata?.key || '--'}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
             {(['DAW', 'KARAOKE', 'GENERATOR', 'EXPLORER', 'TUNER'] as LabModule[]).map(m => (
               <button 
                key={m} 
                onClick={() => setActiveModule(m)} 
                className={`px-4 py-1.5 text-[9px] mono uppercase font-bold rounded-lg transition-all ${activeModule === m ? 'bg-white text-black shadow-lg shadow-white/5' : 'text-white/40 hover:text-white'}`}
               >
                 {m}
               </button>
             ))}
          </div>
          <div className="h-6 w-px bg-white/10" />
          <div className="flex gap-2">
            <button onClick={saveProjectToLocal} className="p-2 px-4 rounded-xl text-[9px] mono uppercase font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-all">Save</button>
            <button onClick={loadProjectFromLocal} className="p-2 px-4 rounded-xl text-[9px] mono uppercase font-bold border border-white/10 bg-white/5 hover:bg-white/10 transition-all">Load</button>
          </div>
        </div>
      </div>

      {/* VIEWPORT AREA */}
      <div className="flex-1 min-h-0 overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#080808]">
        {!songFile && activeModule !== 'GENERATOR' ? (
          <div 
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-full flex flex-col items-center justify-center gap-8 cursor-pointer hover:bg-white/[0.02] transition-all group"
          >
            <div className="w-24 h-24 rounded-full bg-white/5 flex items-center justify-center border border-white/10 group-hover:scale-110 transition-all">
              <span className="text-4xl opacity-20 group-hover:opacity-60 transition-opacity">↑</span>
            </div>
            <div className="text-center">
              <h3 className="text-2xl font-bold tracking-tight">Drop Audio to Initialize Timeline</h3>
              <p className="text-white/40 mono text-xs uppercase tracking-widest mt-2">Or Navigate to Generator for AI Synthesis</p>
            </div>
            <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) { setSongFile(file); simulateProcessing(); }
            }} accept="audio/*" />
          </div>
        ) : activeModule === 'DAW' ? (
          <div className="h-full flex flex-col">
            {/* TIMELINE HEAD */}
            <div className="flex h-10 border-b border-white/10 bg-black/40">
              <div className="w-64 border-r border-white/10 flex items-center px-6">
                <span className="text-[9px] mono text-white/40 uppercase tracking-widest">Track Header</span>
              </div>
              <div className="flex-1 relative cursor-crosshair overflow-x-hidden" onClick={handleTimelineSeek}>
                {/* RULER */}
                <div className="flex h-full items-end pb-2 px-8 gap-12" style={{ width: `${100 * zoom}%` }}>
                  {Array.from({ length: 15 }).map((_, i) => (
                    <div key={i} className="flex flex-col gap-1 items-start min-w-[40px]">
                      <span className="text-[7px] mono text-white/20">{i}:{(i*12).toString().padStart(2, '0')}</span>
                      <div className="h-2 w-px bg-white/20" />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* TRACKS AREA */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
              {stems.map((stem, idx) => {
                const active = isStemActive(stem);
                const isSoloed = soloedIds.includes(stem.id);
                return (
                  <div key={stem.id} className={`flex h-32 border-b border-white/5 transition-all group/track ${active ? 'bg-white/[0.02]' : 'bg-black/40 opacity-40'}`}>
                    {/* TRACK CONTROLS */}
                    <div className="w-64 border-r border-white/10 p-4 space-y-4 bg-black/40">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-xs font-bold uppercase truncate max-w-[120px]">{stem.name}</p>
                          <p className={`text-[8px] mono uppercase font-bold text-${stem.color} opacity-60`}>Neural_{stem.id}</p>
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => setSoloedIds(prev => prev.includes(stem.id) ? prev.filter(id => id !== stem.id) : [...prev, stem.id])} 
                            className={`w-7 h-7 rounded-lg text-[9px] mono font-black border transition-all ${isSoloed ? 'bg-amber-400 border-amber-400 text-black' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                          >S</button>
                          <button 
                            onClick={() => setStems(stems.map(s => s.id === stem.id ? { ...s, muted: !s.muted } : s))} 
                            className={`w-7 h-7 rounded-lg text-[9px] mono font-black border transition-all ${stem.muted ? 'bg-red-500 border-red-500 text-white' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                          >M</button>
                        </div>
                      </div>
                      
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[8px] mono text-white/20">
                          <span>Vol</span>
                          <span>{stem.volume}%</span>
                        </div>
                        <input 
                          type="range" min="0" max="100" value={stem.volume} 
                          onChange={(e) => setStems(stems.map(s => s.id === stem.id ? { ...s, volume: parseInt(e.target.value) } : s))} 
                          className={`w-full h-1 bg-white/5 accent-${stem.color}`} 
                        />
                      </div>
                    </div>

                    {/* TRACK TIMELINE VIEW */}
                    <div 
                      className="flex-1 relative overflow-hidden bg-black/20"
                      ref={timelineRef}
                      onClick={handleTimelineSeek}
                    >
                      <div className="absolute inset-0 flex items-center px-8 gap-[1px]" style={{ width: `${100 * zoom}%` }}>
                        {stemWaveforms[idx]?.map((val, i) => (
                          <div 
                            key={i} 
                            className={`flex-1 min-w-[2px] rounded-full transition-all duration-500 bg-${stem.color} ${active ? 'opacity-40' : 'opacity-5'}`} 
                            style={{ 
                              height: `${val * (stem.volume / 100) * (playbackStatus === 'PLAYING' && active ? (Math.random() * 0.4 + 0.8) : 1) * 100}%` 
                            }} 
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* SHARED PLAYHEAD */}
              <div 
                className="absolute top-0 bottom-0 w-[2px] bg-white shadow-[0_0_15px_white] z-50 pointer-events-none" 
                style={{ left: `calc(${playbackProgress}% + 256px)` }}
              >
                <div className="w-3 h-3 bg-white rotate-45 -translate-x-1/2 -translate-y-1/2 shadow-xl" />
              </div>
            </div>
            
            {/* DAW BOTTOM BAR */}
            <div className="h-10 border-t border-white/10 bg-black/60 px-8 flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <span className="text-[9px] mono text-white/20 uppercase tracking-widest">Master Logic</span>
                 <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] mono text-white/60 font-bold uppercase tracking-tighter">Isolation_v3.2_Engine_Loaded</span>
                 </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] mono text-white/20 uppercase">Scale</span>
                  <input type="range" min="1" max="5" step="0.1" value={zoom} onChange={(e) => setZoom(parseFloat(e.target.value))} className="w-24 accent-white h-1 bg-white/10 rounded" />
                </div>
                <button onClick={() => alert('Multi-track archive exported.')} className="bg-white text-black px-4 py-1 rounded text-[9px] mono font-black uppercase hover:opacity-80">Export Session</button>
              </div>
            </div>
          </div>
        ) : activeModule === 'GENERATOR' ? (
          <div className="max-w-3xl mx-auto w-full py-20 space-y-12 h-full overflow-y-auto custom-scrollbar px-8">
            <div className="text-center space-y-4">
              <h3 className="text-5xl font-black tracking-tighter uppercase italic">Neural Synthesis</h3>
              <p className="text-white/40 italic">Construct a multi-track DAW project from pure latent intent.</p>
            </div>
            <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] space-y-8 relative overflow-hidden">
               <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-2">
                    <label className="text-[10px] mono text-white/40 uppercase tracking-widest">Genre Axis</label>
                    <input type="text" value={genGenre} onChange={(e) => setGenGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-sm focus:border-white/40 outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] mono text-white/40 uppercase tracking-widest">Emotional Mood</label>
                    <input type="text" value={genMood} onChange={(e) => setGenMood(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-sm focus:border-white/40 outline-none" />
                  </div>
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] mono text-white/40 uppercase tracking-widest">Instruments (CSV)</label>
                  <textarea value={genInstruments} onChange={(e) => setGenInstruments(e.target.value)} rows={2} className="w-full bg-black border border-white/10 rounded-xl px-5 py-3 text-sm focus:border-white/40 outline-none resize-none" />
               </div>
               <button onClick={handleGenerateAISong} disabled={isGenerating} className="w-full py-6 bg-white text-black font-black uppercase text-xs tracking-[0.3em] rounded-2xl hover:bg-zinc-200 transition-all shadow-2xl">
                 {isGenerating ? 'Synthesizing...' : 'Initialize DAW Project'}
               </button>
            </div>
          </div>
        ) : activeModule === 'EXPLORER' ? (
          <div className="max-w-4xl mx-auto w-full py-20 space-y-12 h-full overflow-y-auto custom-scrollbar px-8">
             <div className="text-center space-y-4">
                <h3 className="text-5xl font-black tracking-tighter uppercase italic">Style Explorer</h3>
                <p className="text-white/40 italic">Inject new instrument layers and remap your session soul.</p>
             </div>
             <div className="bg-white/[0.03] border border-white/10 p-10 rounded-[3rem] space-y-10">
                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[10px] mono text-white/40 uppercase tracking-widest">New Genre</label>
                    <input type="text" value={remapGenre} onChange={(e) => setRemapGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-xl font-bold focus:border-white/40 outline-none" />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[10px] mono text-white/40 uppercase tracking-widest">New Mood</label>
                    <input type="text" value={remapMood} onChange={(e) => setRemapMood(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-5 py-4 text-xl font-bold focus:border-white/40 outline-none" />
                  </div>
                </div>
                <button onClick={handleNeuralRemap} disabled={isRemapping} className="w-full py-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-black uppercase text-xs tracking-[0.4em] rounded-2xl">
                  {isRemapping ? 'Remapping Latent Space...' : 'Execute Neural Transformation'}
                </button>
             </div>
          </div>
        ) : activeModule === 'KARAOKE' ? (
          <div className="h-full bg-black p-12 flex flex-col items-center justify-center relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent" />
            <div className="w-full flex-1 overflow-y-auto custom-scrollbar-hidden py-32 flex flex-col gap-12 mask-fade text-center">
              {metadata?.lyrics?.map((line, idx) => (
                <h4 
                  key={idx} 
                  onClick={() => jumpToTime(line.time)}
                  className={`text-4xl lg:text-7xl font-black italic tracking-tighter transition-all duration-700 cursor-pointer ${idx === currentLyricIndex ? 'text-white scale-110 opacity-100' : 'text-white/10 scale-90 blur-[1px]'}`}
                >
                  {line.text}
                </h4>
              ))}
              {!metadata?.lyrics && <p className="text-6xl font-black italic opacity-10">NO_LYRICS_SYNCED</p>}
            </div>
            <style>{`.mask-fade { mask-image: linear-gradient(to bottom, transparent, black 40%, black 60%, transparent); }`}</style>
          </div>
        ) : activeModule === 'TUNER' ? (
          <div className="p-10 h-full overflow-y-auto"><GuitarTuner /></div>
        ) : null}
      </div>

      {isProcessing && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-10 space-y-12">
           <div className="w-full max-w-2xl space-y-6">
              <div className="flex justify-between text-[10px] mono uppercase text-white/60 tracking-[0.4em]">
                 <span>{processingStatus || 'Initializing Pipeline'}</span>
                 <span>{processingProgress}%</span>
              </div>
              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/10">
                 <div className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-purple-500 animate-pulse transition-all duration-300" style={{ width: `${processingProgress}%` }} />
              </div>
              <div className="h-32 bg-black/40 rounded-2xl border border-white/5 p-6 overflow-hidden font-mono text-[10px] text-emerald-500/80 italic space-y-1">
                 {processingLog.map((log, i) => <div key={i} className="animate-in fade-in slide-in-from-left-2 opacity-60">>> {log}</div>)}
                 <div ref={logEndRef} />
              </div>
           </div>
        </div>
      )}

      <style>{`
        input[type='range'] { -webkit-appearance: none; background: rgba(255,255,255,0.05); height: 4px; border-radius: 2px; }
        input[type='range']::-webkit-slider-thumb { -webkit-appearance: none; width: 12px; height: 12px; background: white; border-radius: 50%; cursor: pointer; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .custom-scrollbar-hidden::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
};

export default AudioLab;
