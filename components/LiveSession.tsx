
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';

interface LiveSessionProps {
  onSelectKey: () => void;
  isKeyActive: boolean;
}

interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: number;
}

const LiveSession: React.FC<LiveSessionProps> = ({ onSelectKey, isKeyActive }) => {
  const [isActive, setIsActive] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [voice, setVoice] = useState('Zephyr');
  const [volume, setVolume] = useState(0); // For visualizer

  const sessionRef = useRef<any>(null);
  const audioContextInRef = useRef<AudioContext | null>(null);
  const audioContextOutRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const transcriptionRef = useRef({ user: '', model: '' });
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, transcriptionRef.current]);

  const decode = (base64: string) => {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  async function decodeAudioData(
    data: Uint8Array,
    ctx: AudioContext,
    sampleRate: number,
    numChannels: number,
  ): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
      const channelData = buffer.getChannelData(channel);
      for (let i = 0; i < frameCount; i++) {
        channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
      }
    }
    return buffer;
  }

  const createBlob = (data: Float32Array) => {
    const l = data.length;
    const int16 = new Int16Array(l);
    let sum = 0;
    for (let i = 0; i < l; i++) {
      int16[i] = data[i] * 32768;
      sum += Math.abs(data[i]);
    }
    setVolume(sum / l); // Update visualizer
    return {
      data: encode(new Uint8Array(int16.buffer)),
      mimeType: 'audio/pcm;rate=16000',
    };
  };

  const startSession = async () => {
    if (!isKeyActive) {
      onSelectKey();
      return;
    }

    setIsConnecting(true);
    setMessages([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      audioContextInRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextOutRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            setIsActive(true);
            setIsConnecting(false);
            const source = audioContextInRef.current!.createMediaStreamSource(stream);
            const scriptProcessor = audioContextInRef.current!.createScriptProcessor(4096, 1, 1);
            
            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            
            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContextInRef.current!.destination);
          },
          onmessage: async (message: LiveServerMessage) => {
            // Handle Transcription
            if (message.serverContent?.outputTranscription) {
              transcriptionRef.current.model += message.serverContent.outputTranscription.text;
            } else if (message.serverContent?.inputTranscription) {
              transcriptionRef.current.user += message.serverContent.inputTranscription.text;
            }

            if (message.serverContent?.turnComplete) {
              if (transcriptionRef.current.user) {
                setMessages(prev => [...prev, { role: 'user', text: transcriptionRef.current.user, timestamp: Date.now() }]);
                transcriptionRef.current.user = '';
              }
              if (transcriptionRef.current.model) {
                setMessages(prev => [...prev, { role: 'model', text: transcriptionRef.current.model, timestamp: Date.now() }]);
                transcriptionRef.current.model = '';
              }
            }

            // Handle Audio
            const audioData = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (audioData && audioContextOutRef.current) {
              const ctx = audioContextOutRef.current;
              nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
              const audioBuffer = await decodeAudioData(decode(audioData), ctx, 24000, 1);
              const source = ctx.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(ctx.destination);
              source.addEventListener('ended', () => sourcesRef.current.delete(source));
              source.start(nextStartTimeRef.current);
              nextStartTimeRef.current += audioBuffer.duration;
              sourcesRef.current.add(source);
            }

            if (message.serverContent?.interrupted) {
              sourcesRef.current.forEach(s => s.stop());
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
            }
          },
          onclose: () => stopSession(),
          onerror: (e) => {
            console.error("Live API Error:", e);
            stopSession();
          }
        },
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          systemInstruction: 'You are an advanced neural audio architect at VIRTUAL SONICS. You help users navigate complex audio landscapes, explain spectral isolation, and brainstorm high-end product concepts. Keep your tone futuristic, technical, and professional.'
        }
      });

      sessionRef.current = await sessionPromise;
    } catch (err) {
      console.error(err);
      setIsConnecting(false);
      setIsActive(false);
    }
  };

  const stopSession = () => {
    if (sessionRef.current) {
      sessionRef.current.close();
      sessionRef.current = null;
    }
    if (audioContextInRef.current) audioContextInRef.current.close();
    if (audioContextOutRef.current) audioContextOutRef.current.close();
    setIsActive(false);
    setIsConnecting(false);
    setVolume(0);
  };

  return (
    <div className="max-w-6xl mx-auto h-full flex flex-col gap-8 animate-in fade-in duration-1000">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-5xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-emerald-400 to-blue-500 bg-clip-text text-transparent">Neural Chat</h2>
          <p className="text-white/40 mt-2 text-[10px] mono uppercase tracking-widest">Real-time Spectral Conversation // Node-V2.5</p>
        </div>
        {!isKeyActive && (
          <button onClick={onSelectKey} className="px-6 py-2 border border-emerald-500/50 text-emerald-400 text-[10px] mono uppercase rounded-full hover:bg-emerald-500/10 transition-all">
            Key Required for Live API
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 flex-1 min-h-0">
        {/* LEFT: NEURAL CORE & CONTROLS */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col items-center justify-center relative overflow-hidden flex-1 group">
            <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 to-transparent opacity-20" />
            
            {/* Neural Visualizer */}
            <div className="relative w-48 h-48 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-full border border-white/10 transition-all duration-300 ${isActive ? 'scale-125 border-emerald-500/20' : ''}`} />
              <div className={`absolute inset-0 rounded-full border border-white/5 scale-150 transition-all duration-500 ${isActive ? 'border-blue-500/10 animate-pulse' : ''}`} />
              
              <div 
                className={`w-32 h-32 rounded-full bg-gradient-to-tr from-emerald-400/20 via-blue-500/20 to-purple-500/20 backdrop-blur-3xl border border-white/10 flex items-center justify-center transition-all duration-300 ${isActive ? 'scale-110 shadow-[0_0_50px_rgba(52,211,153,0.3)]' : ''}`}
                style={{ transform: isActive ? `scale(${1 + volume * 2})` : 'scale(1)' }}
              >
                <div className={`w-4 h-4 rounded-full bg-white shadow-[0_0_20px_white] ${isActive ? 'animate-pulse' : 'opacity-20'}`} />
              </div>
            </div>

            <div className="mt-12 text-center space-y-2 relative z-10">
              <p className="text-[10px] mono text-white/40 uppercase tracking-[0.4em]">Signal Status</p>
              <h4 className={`text-xl font-bold italic tracking-tighter ${isActive ? 'text-emerald-400' : 'text-white/20'}`}>
                {isConnecting ? 'ESTABLISHING...' : isActive ? 'SYSTEM_ACTIVE' : 'READY_TO_CONNECT'}
              </h4>
            </div>

            <button
              onClick={isActive ? stopSession : startSession}
              disabled={isConnecting}
              className={`mt-10 w-full py-5 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] transition-all relative overflow-hidden ${
                isActive 
                ? 'bg-red-500 text-white shadow-xl shadow-red-500/20' 
                : 'bg-white text-black hover:scale-105 active:scale-95'
              }`}
            >
              {isConnecting ? 'Connecting...' : isActive ? 'Terminate Session' : 'Initiate Neural Link'}
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="space-y-4">
              <label className="text-[10px] mono text-white/40 uppercase tracking-widest">Neural Voice Interface</label>
              <div className="grid grid-cols-2 gap-2">
                {['Zephyr', 'Puck', 'Kore', 'Fenrir'].map(v => (
                  <button
                    key={v}
                    onClick={() => setVoice(v)}
                    disabled={isActive}
                    className={`py-3 rounded-xl text-[10px] mono font-bold border transition-all ${voice === v ? 'bg-white text-black border-white' : 'text-white/40 border-white/10 hover:border-white/30'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="flex justify-between text-[9px] mono text-white/20 uppercase">
                <span>Latency</span>
                <span className="text-emerald-400">14ms</span>
              </div>
              <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 w-[15%]" />
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: TRANSCRIPTION LOG */}
        <div className="lg:col-span-8 bg-black/40 border border-white/10 rounded-[2.5rem] p-8 flex flex-col relative overflow-hidden h-[600px] lg:h-auto">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
          
          <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 space-y-8 py-12">
            {messages.length === 0 && !isActive && (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-20 space-y-4">
                <span className="text-4xl">◎</span>
                <p className="mono text-xs uppercase tracking-widest">Awaiting Neural Handshake</p>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col gap-2 ${m.role === 'user' ? 'items-end' : 'items-start'} animate-in slide-in-from-bottom-2 duration-500`}>
                <span className="text-[9px] mono text-white/20 uppercase tracking-widest">{m.role === 'user' ? 'Client' : 'Neural Core'}</span>
                <div className={`max-w-[80%] p-4 rounded-2xl border ${m.role === 'user' ? 'bg-white/5 border-white/10 rounded-tr-none' : 'bg-blue-500/5 border-blue-500/20 rounded-tl-none'}`}>
                  <p className="text-sm font-medium leading-relaxed">{m.text}</p>
                </div>
              </div>
            ))}
            
            {/* Live Transcription placeholders */}
            {isActive && (
               <>
                {transcriptionRef.current.user && (
                   <div className="flex flex-col gap-2 items-end opacity-40 italic">
                      <span className="text-[9px] mono text-white/20 uppercase tracking-widest">Client (Live)</span>
                      <div className="max-w-[80%] p-4 rounded-2xl border bg-white/5 border-white/10 rounded-tr-none">
                        <p className="text-sm font-medium leading-relaxed">{transcriptionRef.current.user}</p>
                      </div>
                   </div>
                )}
                {transcriptionRef.current.model && (
                   <div className="flex flex-col gap-2 items-start opacity-40 italic">
                      <span className="text-[9px] mono text-white/20 uppercase tracking-widest">Neural Core (Live)</span>
                      <div className="max-w-[80%] p-4 rounded-2xl border bg-blue-500/5 border-blue-500/20 rounded-tl-none">
                        <p className="text-sm font-medium leading-relaxed">{transcriptionRef.current.model}</p>
                      </div>
                   </div>
                )}
               </>
            )}
            <div ref={logEndRef} />
          </div>

          <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black to-transparent z-10 pointer-events-none" />
          
          <div className="mt-4 flex items-center justify-between text-[10px] mono text-white/20 uppercase bg-black/80 backdrop-blur-md p-4 rounded-2xl border border-white/5 z-20">
            <span>Encrypted Stream</span>
            <div className="flex gap-4">
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" /> Audio_In</span>
              <span className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Transcription</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LiveSession;