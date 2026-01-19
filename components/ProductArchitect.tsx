
import React, { useState } from 'react';
import { GoogleGenAI } from '@google/genai';
import { ProductConcept } from '../types';

interface ArchitectProps {
  onSelectKey: () => void;
  isKeyActive: boolean;
}

const ProductArchitect: React.FC<ArchitectProps> = ({ onSelectKey, isKeyActive }) => {
  const [brand, setBrand] = useState('');
  const [size, setSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [isLoading, setIsLoading] = useState(false);
  const [concept, setConcept] = useState<ProductConcept | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateConcept = async () => {
    if (!brand.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      // Step 1: Brainstorm prompt using Text Model
      const brainstormResponse = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `You are a world-class Viral Product Architect. Invent a hyper-realistic, unexpected, and visually stunning physical product concept for the brand: ${brand}. 
        Return ONLY a detailed image prompt in English for a professional 3D product render. 
        Focus on iconic materials, unexpected objects, and high-fashion tech aesthetic.`,
        config: {
          tools: [{googleSearch: {}}], // Use search to get brand DNA
        }
      });

      const prompt = brainstormResponse.text?.trim() || `High-end speculative product design for ${brand}, minimalist luxury, studio lighting.`;
      
      // Step 2: Generate Image using Image Model
      const imgAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const imageResponse = await imgAi.models.generateContent({
        model: 'gemini-3-pro-image-preview',
        contents: {
          parts: [{ text: prompt }]
        },
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: size
          }
        }
      });

      let imageUrl = '';
      for (const part of imageResponse.candidates[0].content.parts) {
        if (part.inlineData) {
          imageUrl = `data:image/png;base64,${part.inlineData.data}`;
        }
      }

      setConcept({
        brand,
        prompt,
        imageUrl
      });
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes("Requested entity was not found")) {
        setError("API Key Error. Please re-select a paid project key.");
      } else {
        setError("Failed to generate concept. Ensure you have a valid paid API key for Pro Image models.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in slide-in-from-bottom-8 duration-700">
      <div className="text-center space-y-4">
        <h2 className="text-5xl font-bold tracking-tighter uppercase italic">Viral Product Architect</h2>
        <p className="text-white/40 text-lg max-w-2xl mx-auto italic">“Turn brand DNA into speculative hype-artifacts.”</p>
      </div>

      <div className="bg-white/[0.03] border border-white/10 p-10 rounded-3xl space-y-8 relative overflow-hidden">
        {/* Glow effect */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        
        <div className="flex flex-col gap-6">
          <div className="space-y-2">
            <label className="text-[10px] mono text-white/40 uppercase tracking-[0.2em]">Input Brand Identity</label>
            <input 
              type="text"
              placeholder="e.g. BALENCIAGA, RIMOWA, LEGO..."
              value={brand}
              onChange={(e) => setBrand(e.target.value.toUpperCase())}
              className="w-full bg-black border border-white/10 rounded-xl px-6 py-4 text-xl font-medium focus:border-white/40 focus:outline-none transition-all"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <span className="text-[10px] mono text-white/40 uppercase">Output Fidelity</span>
              <div className="flex gap-2">
                {(['1K', '2K', '4K'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setSize(s)}
                    className={`px-3 py-1 rounded text-[10px] font-bold border transition-all ${size === s ? 'bg-white text-black border-white' : 'text-white/40 border-white/10 hover:border-white/30'}`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            {!isKeyActive ? (
              <button 
                onClick={onSelectKey}
                className="px-8 py-3 bg-blue-600 text-white font-bold text-[10px] mono uppercase rounded-full hover:bg-blue-500 transition-all flex items-center gap-2"
              >
                <span>⚠️ Select Key for Image Gen</span>
              </button>
            ) : (
              <button 
                onClick={generateConcept}
                disabled={isLoading || !brand}
                className="px-8 py-4 bg-white text-black font-bold text-xs uppercase tracking-[0.2em] rounded-full hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {isLoading ? 'Architecting...' : 'Generate Hype Concept'}
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs mono">
            {error}
            {error.includes("Key Error") && (
              <button onClick={onSelectKey} className="ml-2 underline hover:no-underline">Fix now</button>
            )}
          </div>
        )}
      </div>

      {concept && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-1000">
          <div className="rounded-3xl overflow-hidden aspect-square border border-white/10 bg-black group relative">
            <img src={concept.imageUrl} alt="Generated Concept" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity p-8 flex flex-end items-end">
              <p className="text-[10px] mono text-white/60">RENDER_UUID: {Math.random().toString(36).substring(7).toUpperCase()}</p>
            </div>
          </div>
          <div className="space-y-6 flex flex-col justify-center">
            <div className="space-y-2">
              <h3 className="text-[10px] mono text-white/40 uppercase tracking-widest">Architectural Insight</h3>
              <p className="text-xl font-light leading-relaxed">{concept.prompt}</p>
            </div>
            <div className="pt-6 border-t border-white/5 flex gap-4">
              <button className="flex-1 py-3 border border-white/10 rounded-xl text-[10px] mono uppercase hover:bg-white/5">Download Asset</button>
              <button className="flex-1 py-3 border border-white/10 rounded-xl text-[10px] mono uppercase hover:bg-white/5">Share to Archive</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductArchitect;
