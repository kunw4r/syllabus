'use client';

import { useState, useCallback } from 'react';
import { Sparkles, X } from 'lucide-react';
import { AVATAR_PRESETS } from '@/lib/api/social';

const AI_STYLES = ['glass', 'lorelei', 'adventurer', 'micah', 'personas', 'open-peeps'];

const PROMPT_CHIPS = [
  'cyberpunk warrior',
  'anime princess',
  'watercolor portrait',
  'space explorer',
  'fantasy elf',
  'neon samurai',
];

interface AvatarPickerProps {
  currentUrl?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function AvatarPicker({ currentUrl, onSelect, onClose }: AvatarPickerProps) {
  const [selectedUrl, setSelectedUrl] = useState(currentUrl || '');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiFallback, setAiFallback] = useState(false);
  const [aiResults, setAiResults] = useState<string[] | null>(null);
  const [aiResultUrl, setAiResultUrl] = useState<string | null>(null);

  const handleSelect = useCallback((url: string) => {
    setSelectedUrl(url);
    onSelect(url);
  }, [onSelect]);

  const generateAvatar = useCallback(async (promptText: string) => {
    if (!promptText?.trim()) return;
    const seed = promptText.trim();
    setAiGenerating(true);
    setAiFallback(false);
    setAiResults(null);
    setAiResultUrl(null);

    try {
      const res = await fetch('/api/avatar/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: seed }),
      });

      if (res.ok) {
        const { url } = await res.json();
        setAiResultUrl(url);
        setAiGenerating(false);
        handleSelect(url);
        return;
      }
    } catch {
      // Server route failed — fall through to DiceBear fallback
    }

    // Fallback: generate DiceBear alternatives from prompt seed
    const results = AI_STYLES.map(
      style => `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}`
    );
    setAiGenerating(false);
    setAiFallback(true);
    setAiResults(results);
  }, [handleSelect]);

  return (
    <div className="relative mt-6 pt-6 border-t border-white/10">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-white/50">Choose an avatar</h3>
        <button onClick={onClose} className="text-white/30 hover:text-white/60 transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* AI Avatar Generator */}
      <div className="mb-5 p-4 bg-gradient-to-r from-accent/10 to-purple-500/10 border border-accent/20 rounded-xl">
        <p className="text-xs text-white/50 mb-2 uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles size={14} className="text-accent" /> AI Avatar Generator
        </p>

        {/* Prompt chips */}
        <div className="flex gap-1.5 flex-wrap mb-2">
          {PROMPT_CHIPS.map(chip => (
            <button
              key={chip}
              onClick={() => { setAiPrompt(chip); generateAvatar(chip); }}
              className="px-2.5 py-1 bg-white/5 hover:bg-accent/20 text-white/40 hover:text-accent text-[10px] rounded-full transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white/70 text-xs focus:outline-none focus:border-accent"
            placeholder="Type anything... e.g. moon prince, anime warrior, space cat"
            value={aiPrompt}
            onChange={e => { setAiPrompt(e.target.value); setAiFallback(false); setAiResults(null); }}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); generateAvatar(aiPrompt); } }}
          />
          <button
            onClick={() => generateAvatar(aiPrompt)}
            disabled={!aiPrompt.trim() || aiGenerating}
            className="bg-accent hover:bg-accent/80 disabled:opacity-30 text-white px-4 py-2 rounded-lg text-xs font-medium transition-colors"
          >
            Generate
          </button>
        </div>

        {/* Loading state */}
        {aiGenerating && (
          <div className="flex items-center gap-2 mt-3 text-xs text-white/40">
            <div className="w-3 h-3 border-2 border-white/20 border-t-accent rounded-full animate-spin" />
            Generating... may take up to 30 seconds
          </div>
        )}

        {/* AI-generated avatar result from storage */}
        {aiResultUrl && !aiGenerating && !aiFallback && (
          <div className="mt-3 flex items-center gap-3">
            <img src={aiResultUrl} alt="AI avatar" className="w-16 h-16 rounded-full object-cover border-2 border-accent/40" />
            <div className="flex flex-col gap-1">
              <span className="text-xs text-green-400">AI avatar generated!</span>
              <button
                onClick={() => generateAvatar(aiPrompt)}
                className="text-xs text-accent hover:text-accent/80 transition-colors text-left"
              >
                Regenerate
              </button>
            </div>
          </div>
        )}

        {/* DiceBear fallback results */}
        {aiFallback && aiResults && (
          <div className="mt-3">
            <p className="text-xs text-white/40 mb-2">
              AI timed out -- here are unique avatars for &quot;{aiPrompt}&quot;:
            </p>
            <div className="flex gap-2 flex-wrap">
              {aiResults.map((url, i) => (
                <button
                  key={i}
                  onClick={() => handleSelect(url)}
                  className={`w-14 h-14 rounded-full overflow-hidden border-2 transition-all hover:scale-110 ${
                    selectedUrl === url ? 'border-accent shadow-lg shadow-accent/30' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  <img src={url} alt={`avatar ${i + 1}`} className="w-full h-full object-cover bg-white/5" />
                </button>
              ))}
            </div>
            <button
              onClick={() => generateAvatar(aiPrompt)}
              className="mt-2 text-xs text-accent hover:text-accent/80 transition-colors"
            >
              Try again
            </button>
          </div>
        )}
      </div>

      {/* Preset sections */}
      {Object.entries(AVATAR_PRESETS).map(([label, urls]) => (
        <div key={label} className="mb-4">
          <p className="text-xs text-white/30 mb-2 uppercase tracking-wider">{label}</p>
          <div className="flex gap-2 flex-wrap">
            {urls.map((url, i) => (
              <button
                key={i}
                onClick={() => handleSelect(url)}
                className={`w-14 h-14 rounded-full overflow-hidden ring-2 transition-all hover:scale-105 ${
                  selectedUrl === url ? 'ring-accent scale-110 shadow-lg shadow-accent/30' : 'ring-transparent hover:ring-white/30'
                }`}
              >
                <img src={url} alt="" className="w-full h-full" />
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className="mt-3">
        <input
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-white/70 text-xs w-full max-w-sm focus:outline-none focus:border-accent"
          placeholder="Or paste a custom avatar URL..."
          value={selectedUrl}
          onChange={e => handleSelect(e.target.value)}
        />
      </div>
    </div>
  );
}
