
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
  const [audioFormat, setAudioFormat] = useState<'MP3' | 'WAV'>('MP3');
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
  const [isAutoTuneActive, setIsAutoTuneActive] = useState(false);
  const [pitchCorrectionDelta, setPitchCorrectionDelta] = useState(0);
  
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [isolationThreshold, setIsolationThreshold] = useState(75); // 0 to 100
  const [zoom, setZoom] = useState(1.5);
  const [metadata, setMetadata] = useState<AudioMetadata | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Spectral Data states
  const [peakLevels, setPeakLevels] = useState<number[]>([]);
  const [rmsLevels, setRmsLevels] = useState<number[]>([]);
  const [frequencyLevels, setFrequencyLevels] = useState<number[][]>([]); // [stems][bands]

  const timelineRef = useRef<HTMLDivElement>(null);
  const logEndRef = useRef<HTMLDivElement>(null);
  const lyricsContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const trackDuration = 180; // Simulated 3 minute track
  const EQ_BANDS = 12; // Increased for more detail

  // Simulated waveform data for each stem
  const stemWaveforms = useMemo(() => {
    return stems.map(() => Array.from({ length: 300 }, () => Math.random() * 0.7 + 0.1));
  }, [stems.length, songFile, isProjectGenerated]);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [processingLog]);

  // Peak Meter, Spectral EQ & Pitch Correction Simulation Loop
  useEffect(() => {
    let interval: number;
    if (playbackStatus === 'PLAYING') {
      interval = window.setInterval(() => {
        const newFreqLevels: number[][] = [];
        const newRms: number[] = [];
        
        const newPeaks = stems.map((stem, stemIdx) => {
          if (!isStemActive(stem)) {
            newFreqLevels[stemIdx] = Array(EQ_BANDS).fill(0);
            newRms[stemIdx] = 0;
            return 0;
          }
          let effectiveVol = stem.volume;
          // Apply reference volume logic for peak visualization
          if (isVocalReference && (stem.name.toLowerCase().includes('vocal') || stem.id === '1')) {
            effectiveVol = Math.max(15, stem.volume * 0.2);
          }
          
          const rawPeak = Math.random() * (effectiveVol / 100);
          newRms[stemIdx] = rawPeak * (0.6 + Math.random() * 0.2); // Simulated RMS is always lower than Peak

          // Generate Spectral EQ bands simulation
          newFreqLevels[stemIdx] = Array.from({ length: EQ_BANDS }, (_, bIdx) => {
             // Basic frequency weighting simulation (bass usually higher amplitude)
             const weighting = 1.0 - (bIdx / EQ_BANDS) * 0.4;
             return Math.random() * (effectiveVol / 100) * weighting * (0.3 + Math.random() * 0.7);
          });
          
          return rawPeak;
        });

        setPeakLevels(newPeaks);
        setRmsLevels(newRms);
        setFrequencyLevels(newFreqLevels);

        if (isAutoTuneActive) {
          setPitchCorrectionDelta((Math.random() - 0.5) * 40); // -20 to +20 cents jitter
        } else {
          setPitchCorrectionDelta(0);
        }
      }, 80); // Slightly faster for smoother LED feel
    } else {
      setPeakLevels(stems.map(() => 0));
      setRmsLevels(stems.map(() => 0));
      setFrequencyLevels(stems.map(() => Array(EQ_BANDS).fill(0)));
      setPitchCorrectionDelta(0);
    }
    return () => clearInterval(interval);
  }, [playbackStatus, stems, soloedIds, isVocalReference, isAutoTuneActive]);

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
        setStems(state.stems.map((s: any) => ({ ...s, pan: s.pan ?? 0 })));
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
        ...(data.newStems || []).map((name: string, i: number) => ({ id: (i + 2).toString(), name, volume: 80, pan: 0, muted: false, color: ['blue-400', 'amber-400', 'purple-400'][i % 3] }))
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
        { id: '1', name: 'Neural Vocals', volume: 80, pan: 0, muted: false, color: 'emerald-400' },
        { id: '2', name: instrumentList[0] || 'Lead Synth', volume: 90, pan: 0, muted: false, color: 'blue-400' },
        { id: '3', name: instrumentList[1] || 'Drum Kit', volume: 85, pan: 0, muted: false, color: 'amber-400' },
        { id: '4', name: instrumentList[2] || 'Sub Bass', volume: 75, pan: 0, muted: false, color: 'purple-400' },
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
      bpm: 124, key: 'Bm', chords: ['Bm', 'G', 'D', 'A', 'Em7', 'F#m'],
      lyrics: [
        { time: 5, text: "Spectral isolation complete" },
        { time: 12, text: "Multitrack reconstruction active" },
        { time: 20, text: "Feel the neural resonance" },
        { time: 28, text: "Breaking down the signal path" },
      ]
    });
    setStems([
      { id: '1', name: 'Isolated Vocals', volume: 0, pan: 0, muted: false, color: 'emerald-400' },
      { id: '2', name: 'Guitars / Keys', volume: 90, pan: 0, muted: false, color: 'blue-400' },
      { id: '3', name: 'Percussion', volume: 80, pan: 0, muted: false, color: 'amber-400' },
      { id: '4', name: 'Bass Line', volume: 75, pan: 0, muted: false, color: 'purple-400' },
    ]);
    setSoloedIds([]);
    setIsProcessing(false);
  };

  const handleExportStems = () => {
    if (!stems.length || isExporting) return;
    setIsExporting(true);
    setProcessingStatus(`EXPORTING_STEMS_${audioFormat}`);
    
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      setProcessingProgress(p);
      if (p >= 100) {
        clearInterval(interval);
        setIsExporting(false);
        alert(`Successfully exported ${stems.length} individual stems as ${audioFormat}.`);
      }
    }, 50);
  };

  const handleExportLyrics = () => {
    if (!metadata?.lyrics) {
      alert("No lyrics available for SRT export.");
      return;
    }
    setIsExporting(true);
    setProcessingStatus('EXPORTING_SRT_LEXICON');
    
    setTimeout(() => {
      setIsExporting(false);
      alert(`Lyrics exported as SubRip (SRT) format.`);
    }, 1500);
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

  // Derived Scale Info based on Key
  const getScaleNotes = (key: string) => {
    const notes = ["B", "C#", "D", "E", "F#", "G", "A"]; // Hardcoded for Bm demo
    return notes;
  };

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* MIXER BAR / SIDEBAR CONTROLS */}
        <div className="lg:col-span-3 space-y-6 overflow-y-auto custom-scrollbar pr-2">
          
          {/* VOCAL REFERENCE & TUNING MODULE */}
          {metadata && stems.length > 0 && (
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[10px] mono text-white/40 uppercase tracking-[0.2em]">Neural Vocal Engine</h4>
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
              </div>
              
              <div className="space-y-4">
                {/* Vocal Reference Toggle */}
                <button 
                  onClick={() => setIsVocalReference(!isVocalReference)}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${isVocalReference ? 'bg-white text-black border-white' : 'bg-black/40 border-white/10 text-white hover:bg-white/5'}`}
                >
                  <div className="text-left">
                    <p className={`text-[10px] mono uppercase font-bold ${isVocalReference ? 'text-black' : 'text-white/60'}`}>Vocal Reference</p>
                    <p className={`text-[8px] italic ${isVocalReference ? 'text-black/60' : 'text-white/30'}`}>Background guidance track</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isVocalReference ? 'bg-black text-white border-black' : 'bg-white/5 border-white/10 group-hover:border-white/40'}`}>
                    {isVocalReference ? 'ON' : 'OFF'}
                  </div>
                </button>

                {/* Auto Tune Toggle */}
                <button 
                  onClick={() => setIsAutoTuneActive(!isAutoTuneActive)}
                  className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group ${isAutoTuneActive ? 'bg-emerald-500 text-black border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-black/40 border-white/10 text-white hover:bg-white/5'}`}
                >
                  <div className="text-left">
                    <p className={`text-[10px] mono uppercase font-bold ${isAutoTuneActive ? 'text-black' : 'text-white/60'}`}>Auto-Tune</p>
                    <p className={`text-[8px] italic ${isAutoTuneActive ? 'text-black/60' : 'text-white/30'}`}>Neural pitch correction</p>
                  </div>
                  <div className={`w-8 h-8 rounded-full border flex items-center justify-center transition-all ${isAutoTuneActive ? 'bg-black text-white border-black' : 'bg-white/5 border-white/10 group-hover:border-white/40'}`}>
                    {isAutoTuneActive ? 'ON' : 'OFF'}
                  </div>
                </button>
              </div>

              {isAutoTuneActive && playbackStatus === 'PLAYING' && (
                <div className="bg-black/40 border border-emerald-500/20 p-4 rounded-2xl space-y-2 animate-in slide-in-from-top-2">
                  <div className="flex justify-between text-[8px] mono text-white/30 uppercase">
                    <span>Correction Delta</span>
                    <span className="text-emerald-400">{pitchCorrectionDelta.toFixed(1)} cents</span>
                  </div>
                  <div className="h-12 flex items-center justify-center gap-1">
                    {Array.from({ length: 12 }).map((_, i) => (
                      <div 
                        key={i} 
                        className={`w-1 transition-all duration-100 rounded-full ${Math.abs(pitchCorrectionDelta) > i * 4 ? 'bg-emerald-400' : 'bg-white/10'}`} 
                        style={{ height: `${Math.max(4, Math.random() * 20)}px` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HARMONIC PROFILE - KEY DISPLAY */}
          {metadata && songFile && (
            <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-4 animate-in fade-in duration-500 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-5 text-4xl font-black italic select-none">{metadata.key}</div>
              <div className="flex justify-between items-center px-1">
                <h4 className="text-[10px] mono text-white/40 uppercase tracking-[0.2em]">Harmonic Profile</h4>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              </div>
              <div className="space-y-4">
                <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[7px] mono text-white/30 uppercase mb-2">Identified Key</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-emerald-400 italic tracking-tighter drop-shadow-[0_0_15px_rgba(52,211,153,0.3)]">{metadata.key}</span>
                    <span className="text-[10px] mono text-white/40 uppercase italic">{metadata.key.includes('m') ? 'Minor Scale' : 'Major Scale'}</span>
                  </div>
                </div>

                <div className="bg-black/40 border border-white/5 p-4 rounded-2xl">
                  <p className="text-[7px] mono text-white/30 uppercase mb-3">Scale Notes</p>
                  <div className="flex justify-between gap-1">
                    {getScaleNotes(metadata.key).map((note, i) => (
                      <div key={i} className="flex flex-col items-center gap-1">
                        <span className="text-[10px] font-bold text-white/80">{note}</span>
                        <div className="w-1 h-1 rounded-full bg-white/10" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                  <p className="text-[7px] mono text-emerald-500/40 uppercase mb-1">Sonic Profile</p>
                  <p className="text-[11px] font-medium text-emerald-300 italic">Nocturnal, moody, and intense. Ideal for ambient textures or synth-wave foundations.</p>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white/5 border border-white/10 p-6 rounded-[2rem] space-y-6">
            <h4 className="text-[10px] mono text-white/40 uppercase tracking-[0.2em] px-2">Project Export</h4>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[8px] mono text-white/30 uppercase px-2">Audio Format</label>
                <div className="flex p-1 bg-black/40 border border-white/5 rounded-xl">
                  {(['MP3', 'WAV'] as const).map(f => (
                    <button key={f} onClick={() => setAudioFormat(f)} className={`flex-1 py-2 text-[10px] mono font-bold rounded-lg transition-all ${audioFormat === f ? 'bg-white text-black' : 'text-white/40 hover:text-white'}`}>{f}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button 
                  onClick={() => alert(`Master mix exported as ${audioFormat}`)}
                  disabled={!songFile || isExporting}
                  className="w-full py-4 bg-white text-black font-black uppercase tracking-widest text-[9px] rounded-xl hover:opacity-90 disabled:opacity-20 transition-all"
                >
                  Export Master ({audioFormat})
                </button>
                <button 
                  onClick={handleExportStems}
                  disabled={!stems.length || isExporting}
                  className="w-full py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[9px] rounded-xl hover:bg-white/10 disabled:opacity-20 transition-all"
                >
                  Export All Stems ({audioFormat})
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* VIEWPORT AREA */}
        <div className="lg:col-span-9 flex flex-col min-h-0 overflow-hidden rounded-[2.5rem] border border-white/5 bg-[#080808]">
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
                <div className="w-80 border-r border-white/10 flex items-center px-6">
                  <span className="text-[9px] mono text-white/40 uppercase tracking-widest">Spectral Track Interface</span>
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

              {/* MASTER ANALYSIS TRACK - KEY DISPLAY */}
              {metadata && (
                <div className="flex h-12 border-b border-white/10 bg-white/[0.02] transition-all group/analysis">
                  <div className="w-80 border-r border-white/10 p-4 py-3 flex items-center gap-2 bg-emerald-500/5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                    <span className="text-[9px] mono text-emerald-400 font-bold uppercase tracking-widest">Harmonic Track</span>
                    <span className="ml-auto text-[10px] font-black italic text-emerald-300">{metadata.key}</span>
                  </div>
                  <div className="flex-1 relative overflow-hidden bg-black/40">
                    <div className="absolute inset-0 flex items-center px-8" style={{ width: `${100 * zoom}%` }}>
                      {metadata.chords.map((chord, i) => (
                        <div 
                          key={i} 
                          className="flex flex-col items-center justify-center border-l border-white/10 h-full px-12 group-hover/analysis:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => jumpToTime(i * (trackDuration / metadata.chords.length))}
                        >
                          <span className="text-[11px] font-black mono text-white/40 group-hover/analysis:text-white transition-colors">{chord}</span>
                          <div className="w-1 h-1 rounded-full bg-white/10 mt-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TRACKS AREA */}
              <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {stems.map((stem, idx) => {
                  const isVocalStem = stem.name.toLowerCase().includes('vocal') || stem.id === '1';
                  const active = isVocalReference && isVocalStem ? true : isStemActive(stem);
                  const isSoloed = soloedIds.includes(stem.id);
                  const currentPeak = peakLevels[idx] || 0;
                  const currentRms = rmsLevels[idx] || 0;
                  const currentFreqs = frequencyLevels[idx] || Array(EQ_BANDS).fill(0);
                  
                  // Reference mode volume override
                  const displayVolume = (isVocalReference && isVocalStem) ? Math.max(20, stem.volume * 0.25) : stem.volume;

                  return (
                    <div key={stem.id} className={`flex h-44 border-b border-white/5 transition-all group/track ${active ? 'bg-white/[0.02]' : 'bg-black/40 opacity-40'}`}>
                      {/* TRACK CONTROLS & HIGH-FIDELITY VISUALIZERS */}
                      <div className="w-80 border-r border-white/10 p-5 space-y-4 bg-black/40 flex flex-col justify-center relative">
                        {isVocalReference && isVocalStem && (
                          <div className="absolute top-2 right-2 px-2 py-0.5 bg-blue-500/20 border border-blue-500/40 rounded text-[7px] mono text-blue-400 font-bold animate-pulse">REF_MODE</div>
                        )}
                        
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4">
                             {/* Segmented LED Peak Meter */}
                             <div className="flex gap-1.5 h-16 w-4 bg-black/60 rounded-sm border border-white/5 p-1 flex-col-reverse items-center justify-start relative group/meter">
                                {Array.from({ length: 20 }).map((_, segmentIdx) => (
                                   <div 
                                      key={segmentIdx} 
                                      className={`w-full h-0.5 rounded-sm transition-all duration-75 ${
                                         currentPeak * 20 > segmentIdx 
                                         ? (segmentIdx > 17 ? 'bg-red-500' : segmentIdx > 14 ? 'bg-amber-400' : `bg-${stem.color}`) 
                                         : 'bg-white/5'
                                      }`}
                                   />
                                ))}
                                {/* RMS indicator overlay */}
                                <div 
                                  className="absolute left-1/2 -translate-x-1/2 w-full h-[2px] bg-white transition-all duration-200 z-10 opacity-60" 
                                  style={{ bottom: `${currentRms * 100}%` }}
                                />
                             </div>

                             <div className="space-y-2">
                                <div>
                                   <p className="text-[11px] font-black uppercase truncate max-w-[130px] leading-none">{stem.name}</p>
                                   <p className={`text-[8px] mono uppercase font-bold text-${stem.color} opacity-60 tracking-tighter`}>Neural_Core_{stem.id}</p>
                                </div>
                                {/* Numerical Peak/RMS Readout */}
                                <div className="flex gap-2 text-[8px] mono text-white/40 border-t border-white/5 pt-2">
                                   <div className="flex flex-col">
                                      <span className="text-[6px] uppercase tracking-tighter">Peak</span>
                                      <span className={currentPeak > 0.9 ? 'text-red-400' : 'text-white'}>-{( (1 - currentPeak) * 60).toFixed(1)} dB</span>
                                   </div>
                                   <div className="flex flex-col">
                                      <span className="text-[6px] uppercase tracking-tighter">RMS</span>
                                      <span>-{( (1 - currentRms) * 72).toFixed(1)} dB</span>
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="flex gap-1">
                            <button 
                              onClick={() => setSoloedIds(prev => prev.includes(stem.id) ? prev.filter(id => id !== stem.id) : [...prev, stem.id])} 
                              className={`w-8 h-8 rounded-lg text-[10px] mono font-black border transition-all ${isSoloed ? 'bg-amber-400 border-amber-400 text-black' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                            >S</button>
                            <button 
                              onClick={() => setStems(stems.map(s => s.id === stem.id ? { ...s, muted: !s.muted } : s))} 
                              className={`w-8 h-8 rounded-lg text-[10px] mono font-black border transition-all ${stem.muted ? 'bg-red-500 border-red-500 text-white' : 'bg-black/40 border-white/5 text-white/40 hover:border-white/20'}`}
                            >M</button>
                          </div>
                        </div>

                        {/* Detailed Spectral EQ Bands */}
                        <div className="space-y-1">
                          <div className="flex justify-between items-center px-1">
                             <span className="text-[7px] mono text-white/20 uppercase tracking-[0.2em]">Spectral Dist.</span>
                             <span className="text-[7px] mono text-white/10">32Hz — 22kHz</span>
                          </div>
                          <div className="flex gap-[2px] items-end h-12 w-full bg-black/40 p-1.5 rounded-xl border border-white/10">
                             {currentFreqs.map((freq, bIdx) => (
                               <div 
                                 key={bIdx}
                                 className={`flex-1 transition-all duration-100 rounded-sm hover:opacity-100 ${
                                    active ? (freq > 0.8 ? 'bg-white' : `bg-${stem.color}`) : 'bg-white/5'
                                 }`}
                                 style={{ height: `${Math.max(2, freq * 100)}%`, opacity: active ? (0.2 + freq * 0.8) : 0.05 }}
                               />
                             ))}
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                           <div className="space-y-1">
                              <div className="flex justify-between text-[7px] mono text-white/30 uppercase">
                                <span>Gain</span>
                                <span>{Math.floor(displayVolume)}%</span>
                              </div>
                              <input 
                                type="range" min="0" max="100" value={stem.volume} 
                                onChange={(e) => setStems(stems.map(s => s.id === stem.id ? { ...s, volume: parseInt(e.target.value) } : s))} 
                                className={`w-full h-1 bg-white/5 accent-${stem.color} cursor-ew-resize`} 
                              />
                           </div>
                           <div className="space-y-1">
                              <div className="flex justify-between text-[7px] mono text-white/30 uppercase">
                                <span>Pan</span>
                                <span className={stem.pan === 0 ? 'text-white/40' : 'text-white'}>{stem.pan === 0 ? 'C' : stem.pan! < 0 ? `${Math.abs(stem.pan!)}L` : `${stem.pan}R`}</span>
                              </div>
                              <input 
                                type="range" min="-100" max="100" step="1" value={stem.pan || 0} 
                                onChange={(e) => setStems(stems.map(s => s.id === stem.id ? { ...s, pan: parseInt(e.target.value) } : s))} 
                                className={`w-full h-1 bg-white/5 accent-white cursor-ew-resize`} 
                              />
                           </div>
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
                                height: `${val * (displayVolume / 100) * (playbackStatus === 'PLAYING' && active ? (0.8 + Math.random() * 0.4) : 1) * 100}%` 
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
                  style={{ left: `calc(${playbackProgress}% + 320px)` }}
                >
                  <div className="w-3 h-3 bg-white rotate-45 -translate-x-1/2 -translate-y-1/2 shadow-xl" />
                </div>
              </div>
              
              {/* DAW BOTTOM BAR */}
              <div className="h-10 border-t border-white/10 bg-black/60 px-8 flex items-center justify-between">
                <div className="flex items-center gap-6">
                   <div className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-[10px] mono text-white/60 font-bold uppercase tracking-tighter">Engine_3.1_Full_Spectral_Isolation_Active</span>
                   </div>
                   <div className="h-4 w-[1px] bg-white/10" />
                   <div className="flex gap-4">
                      <p className="text-[9px] mono text-white/20 uppercase">Sample Rate: <span className="text-white/40">48kHz</span></p>
                      <p className="text-[9px] mono text-white/20 uppercase">Bit Depth: <span className="text-white/40">32-Bit Floating</span></p>
                   </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] mono text-white/20 uppercase">Timeline Scale</span>
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
                      <input type="text" value={genGenre} onChange={(e) => setGenGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-6 py-4 text-sm focus:border-white/40 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] mono text-white/40 uppercase tracking-widest">Emotional Mood</label>
                      <input type="text" value={genMood} onChange={(e) => setGenMood(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-6 py-4 text-sm focus:border-white/40 outline-none" />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] mono text-white/40 uppercase tracking-widest">Instruments (CSV)</label>
                    <textarea value={genInstruments} onChange={(e) => setGenInstruments(e.target.value)} rows={2} className="w-full bg-black border border-white/10 rounded-xl px-6 py-4 text-sm focus:border-white/40 outline-none resize-none" />
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
                      <input type="text" value={remapGenre} onChange={(e) => setRemapGenre(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-6 py-5 text-xl font-bold focus:border-white/40 outline-none" />
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] mono text-white/40 uppercase tracking-widest">New Mood</label>
                      <input type="text" value={remapMood} onChange={(e) => setRemapMood(e.target.value)} className="w-full bg-black border border-white/10 rounded-xl px-6 py-5 text-xl font-bold focus:border-white/40 outline-none" />
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
      </div>

      { (isProcessing || isExporting) && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex flex-col items-center justify-center p-10 space-y-12">
           <div className="w-full max-w-2xl space-y-6">
              <div className="flex justify-between text-[10px] mono uppercase text-white/60 tracking-[0.4em]">
                 <span>{processingStatus || 'Initializing Pipeline'}</span>
                 <span>{Math.floor(processingProgress)}%</span>
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
