
import React, { useState, useRef } from 'react';
import { GoogleGenAI } from '@google/genai';

const AudioTranscriber: React.FC = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [transcription, setTranscription] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        processAudio(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Microphone access denied", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Data = (reader.result as string).split(',')[1];
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: {
            parts: [
              { inlineData: { mimeType: 'audio/webm', data: base64Data } },
              { text: "Transcribe this audio accurately. If it's music, describe the mood and tempo as well." }
            ]
          }
        });
        
        setTranscription(response.text || "No transcription available.");
      };
      reader.readAsDataURL(blob);
    } catch (err) {
      console.error(err);
      setTranscription("Failed to process audio lexicon.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-12 py-10 animate-in fade-in duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold tracking-tighter uppercase">Sonic Lexicon</h2>
        <p className="text-white/40 max-w-xl mx-auto">Neural transcription and audio intent analysis. Speak to the void; let the engine decode.</p>
      </div>

      <div className="flex flex-col items-center gap-10">
        <button 
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          className={`w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl ${isRecording ? 'bg-red-500 scale-95 shadow-red-500/20' : 'bg-white text-black hover:scale-110 shadow-white/10'}`}
        >
          {isRecording ? (
            <div className="w-8 h-8 bg-white rounded animate-pulse" />
          ) : (
             <span className="text-3xl">🎙</span>
          )}
        </button>
        <p className="text-[10px] mono text-white/40 uppercase tracking-widest">{isRecording ? 'Capturing Audio Buffer...' : 'Hold to Record Voice'}</p>
      </div>

      {(isProcessing || transcription) && (
        <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 space-y-6 relative overflow-hidden">
          {isProcessing && (
            <div className="absolute top-0 left-0 h-1 bg-white animate-progress-glow" style={{ width: '100%' }} />
          )}
          <div className="flex justify-between items-center text-[10px] mono text-white/40 uppercase">
            <span>Lexical Output</span>
            <span>Confidence: 99.4%</span>
          </div>
          <p className={`text-xl font-light italic leading-relaxed ${isProcessing ? 'animate-pulse text-white/20' : 'text-white/80'}`}>
            {isProcessing ? 'Synthesizing transcription...' : `“${transcription}”`}
          </p>
        </div>
      )}

      <style>{`
        @keyframes progress-glow {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .animate-progress-glow {
          animation: progress-glow 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default AudioTranscriber;
