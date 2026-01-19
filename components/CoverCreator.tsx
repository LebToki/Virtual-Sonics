
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';

interface CoverCreatorProps {
  onSelectKey: () => void;
  isKeyActive: boolean;
}

const CoverCreator: React.FC<CoverCreatorProps> = ({ onSelectKey, isKeyActive }) => {
  const [songTitle, setSongTitle] = useState('');
  const [genre, setGenre] = useState('Cyberpunk');
  const [isGenerating, setIsGenerating] = useState(false);
  const [coverUrl, setCoverUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateCover = async () => {
    if (!songTitle.trim()) return;
    setIsGenerating(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const promptText = `Professional cinematic high-end 2K album cover art for a song titled "${songTitle}". Genre: ${genre}. Avant-garde design, minimalist luxury, studio lighting, complex textures. Aspect ratio 16:9. Must look like it was designed by a world-class creative agency like Pentagram. No text on image, only abstract visual or hyper-realistic object.`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: promptText }]
        },
        config: {
          imageConfig: {
            aspectRatio: "16:9",
            imageSize: "2K"
          }
        }
      });

      let imageUrl = '';
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      setCoverUrl(imageUrl);
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key Error. High-quality image generation requires a valid paid project key.");
      } else {
        setError("Generation failed. Please ensure your project has the required quotas for Gemini 3 Pro Image.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in duration-1000">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <h2 className="text-5xl font-black tracking-tighter uppercase italic">Cover Art Gen-V</h2>
          <p className="text-white/40 text-lg max-w-xl">Create original 1920x1080 (16:9) cinematic covers for your multi-track isolated records.</p>
        </div>
        {!isKeyActive && (
          <button 
            onClick={onSelectKey}
            className="px-6 py-2 border border-blue-500/50 text-blue-400 text-[10px] mono uppercase rounded-full hover:bg-blue-500/10 transition-all"
          >
            Activate 2K Key Required
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-8 bg-white/5 p-8 rounded-3xl border border-white/10">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] mono text-white/40 uppercase tracking-widest">Song Context</label>
              <input 
                type="text" 
                placeholder="Title or Theme"
                value={songTitle}
                onChange={(e) => setSongTitle(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-white/40 outline-none"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] mono text-white/40 uppercase tracking-widest">Aesthetic Axis</label>
              <select 
                value={genre}
                onChange={(e) => setGenre(e.target.value)}
                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-white/40 outline-none appearance-none"
              >
                <option>Cyberpunk Noir</option>
                <option>Minimalist Glass</option>
                <option>Deep Brutalism</option>
                <option>Liquid Chrome</option>
                <option>Organic Hyper-texture</option>
              </select>
            </div>
          </div>

          <button 
            onClick={generateCover}
            disabled={!isKeyActive || isGenerating || !songTitle}
            className="w-full py-4 bg-white text-black font-black uppercase text-[10px] tracking-[0.2em] rounded-xl hover:bg-zinc-200 transition-all disabled:opacity-20"
          >
            {isGenerating ? 'Rendering 2K Asset...' : 'Compute Cover Art'}
          </button>

          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-[10px] mono leading-relaxed">
              {error}
            </div>
          )}
        </div>

        <div className="lg:col-span-3">
          <div className="aspect-video bg-black border border-white/10 rounded-3xl overflow-hidden relative group">
            {coverUrl ? (
              <>
                <img src={coverUrl} alt="Generated Cover" className="w-full h-full object-cover transition-transform duration-[2000ms] group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-10 flex items-end">
                   <div className="flex justify-between w-full items-end">
                      <div className="mono text-[10px] text-white/60 space-y-1">
                        <p>ID: {Math.random().toString(36).substr(2, 9).toUpperCase()}</p>
                        <p>RES: 1920x1080 // 2K_ULTRA</p>
                      </div>
                      <button className="px-6 py-2 bg-white text-black font-bold text-[10px] uppercase rounded-full">Save Asset</button>
                   </div>
                </div>
              </>
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center space-y-6 opacity-20 group-hover:opacity-40 transition-opacity">
                <div className="w-24 h-24 border-2 border-white/20 rounded-full flex items-center justify-center text-4xl">▣</div>
                <div className="text-center">
                  <p className="mono text-xs uppercase tracking-[0.3em]">Canvas Ready</p>
                  <p className="text-[10px] mono mt-2">16:9 CINEMATIC VIEWPORT</p>
                </div>
              </div>
            )}
            
            {isGenerating && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center space-y-6">
                <div className="w-20 h-20 relative">
                  <div className="absolute inset-0 border-2 border-white/10 rounded-full" />
                  <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="mono text-xs uppercase tracking-[0.5em] animate-pulse">Processing Latent Space</p>
                  <p className="text-[10px] mono text-white/20">RESOLVING GEOMETRY...</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CoverCreator;
