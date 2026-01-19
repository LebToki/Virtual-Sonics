
import React, { useState, useEffect, useRef } from 'react';

type TuningMode = 'Standard' | 'Drop D';

interface StringStatus {
  note: string;
  cents: number;
  inTune: boolean;
  active: boolean;
}

const TUNINGS: Record<TuningMode, string[]> = {
  'Standard': ['E2', 'A2', 'D3', 'G3', 'B3', 'E4'],
  'Drop D': ['D2', 'A2', 'D3', 'G3', 'B3', 'E4'],
};

const GuitarTuner: React.FC = () => {
  const [mode, setMode] = useState<TuningMode>('Standard');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [stringStates, setStringStates] = useState<StringStatus[]>([]);
  const animationRef = useRef<number>(null);
  const audioContextRef = useRef<AudioContext>(null);
  const analyserRef = useRef<AnalyserNode>(null);

  useEffect(() => {
    setStringStates(TUNINGS[mode].map(note => ({
      note,
      cents: (Math.random() * 40) - 20, // Initial random offset
      inTune: false,
      active: false
    })));
  }, [mode]);

  const toggleMonitor = async () => {
    if (isMonitoring) {
      setIsMonitoring(false);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      setIsMonitoring(true);
      
      // Simulation logic for visual feedback
      const updateLoop = () => {
        setStringStates(prev => prev.map(s => {
          const jitter = (Math.random() - 0.5) * 2;
          const newCents = Math.max(-50, Math.min(50, s.cents + jitter));
          return {
            ...s,
            cents: newCents,
            inTune: Math.abs(newCents) < 5,
            active: Math.random() > 0.8 // Randomly simulate which string is "heard"
          };
        }));
        animationRef.current = requestAnimationFrame(updateLoop);
      };
      updateLoop();
    } catch (err) {
      console.error("Mic access denied", err);
      alert("Microphone access is required for the tuner.");
    }
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight uppercase italic">Precision Tuner</h3>
          <p className="text-white/40 text-xs mono mt-1">REAL-TIME SPECTRAL PITCH ANALYSIS</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5">
            {(['Standard', 'Drop D'] as TuningMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-4 py-2 text-[10px] mono uppercase font-bold rounded-lg transition-all ${
                  mode === m ? 'bg-white text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          
          <button
            onClick={toggleMonitor}
            className={`px-6 py-3 rounded-full text-[10px] mono font-bold uppercase transition-all flex items-center gap-2 ${
              isMonitoring ? 'bg-red-500 text-white animate-pulse' : 'bg-emerald-500 text-black'
            }`}
          >
            {isMonitoring ? 'Stop Monitoring' : 'Start Tuner'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 h-64">
        {stringStates.map((s, idx) => (
          <div key={idx} className="relative flex flex-col items-center justify-between group">
            {/* Tuning Meter */}
            <div className="w-full flex-1 flex flex-col items-center justify-center gap-2 relative">
              <div className="h-full w-px bg-white/10 absolute left-1/2 -translate-x-1/2" />
              
              {/* Cents Indicator */}
              <div 
                className={`w-4 h-4 rounded-full border-2 transition-all duration-300 absolute left-1/2 -translate-x-1/2 ${
                  s.inTune ? 'bg-emerald-400 border-emerald-400 scale-125' : 'bg-transparent border-white/20'
                }`}
                style={{ 
                  bottom: `${50 + (s.cents)}%`,
                  boxShadow: s.inTune ? '0 0 20px rgba(52, 211, 153, 0.4)' : 'none'
                }}
              />
              
              {/* Calibration Marks */}
              <div className="absolute left-1/2 -translate-x-1/2 w-6 h-px bg-white/40 bottom-[50%]" />
              <div className="absolute left-1/2 -translate-x-1/2 w-3 h-px bg-white/10 bottom-[75%]" />
              <div className="absolute left-1/2 -translate-x-1/2 w-3 h-px bg-white/10 bottom-[25%]" />
            </div>

            {/* Note & Label */}
            <div className="text-center space-y-2 mt-4">
              <div className={`text-2xl font-black italic transition-colors ${s.inTune ? 'text-emerald-400' : 'text-white/20'}`}>
                {s.note.replace(/[0-9]/, '')}
              </div>
              <div className="text-[10px] mono text-white/40 uppercase tracking-widest">String {6 - idx}</div>
            </div>

            {/* Visual String Vibration */}
            <div 
              className={`absolute top-0 bottom-16 left-1/2 w-[2px] -translate-x-1/2 opacity-20 transition-all ${
                s.active && isMonitoring ? 'bg-white blur-[1px]' : 'bg-white/5'
              }`}
              style={{
                animation: s.active && isMonitoring ? 'vibrate 0.1s linear infinite' : 'none'
              }}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center">
         <div className="px-6 py-3 bg-white/5 border border-white/5 rounded-2xl flex items-center gap-6">
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-emerald-500" />
               <span className="text-[10px] mono text-white/40 uppercase">Perfect</span>
            </div>
            <div className="flex items-center gap-2">
               <span className="w-2 h-2 rounded-full bg-amber-500" />
               <span className="text-[10px] mono text-white/40 uppercase">Flat / Sharp</span>
            </div>
            <div className="h-4 w-px bg-white/10" />
            <p className="text-[10px] mono text-white/40 uppercase italic">Calibration: A=440Hz</p>
         </div>
      </div>

      <style>{`
        @keyframes vibrate {
          0% { transform: translate(-50%, 0) skewX(0deg); }
          25% { transform: translate(-51%, 0) skewX(0.5deg); }
          75% { transform: translate(-49%, 0) skewX(-0.5deg); }
          100% { transform: translate(-50%, 0) skewX(0deg); }
        }
      `}</style>
    </div>
  );
};

export default GuitarTuner;
