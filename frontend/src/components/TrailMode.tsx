import { useState } from 'react';
import type { Episode } from '../types';
import { Play, Pause, X } from 'lucide-react';

interface TrailModeProps {
  episode: Episode;
  onExit: () => void;
}

export default function TrailMode({ episode, onExit }: TrailModeProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-forest-800)] to-[var(--color-forest-900)] text-white flex flex-col z-50">
      <header className="p-8 flex justify-between items-start">
        <div>
          <h2 className="text-xl font-medium text-[var(--color-forest-200)] mb-1">Trail Mode</h2>
          <h1 className="text-4xl font-bold tracking-tight">{episode.title}</h1>
        </div>
        <button 
          onClick={onExit}
          className="p-3 bg-white/10 hover:bg-white/20 rounded-full backdrop-blur-sm transition-colors"
        >
          <X size={24} />
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-lg mb-16">
          <div className="flex justify-between text-sm font-medium text-[var(--color-forest-200)] mb-4">
            <span>0:00</span>
            <span>-8:05</span>
          </div>
          <div className="h-4 bg-white/20 rounded-full relative overflow-hidden cursor-pointer">
            <div className="absolute top-0 left-0 h-full w-1/4 bg-[var(--color-forest-300)] rounded-full"></div>
          </div>
        </div>

        <button 
          onClick={() => setIsPlaying(!isPlaying)}
          className="w-32 h-32 bg-[var(--color-forest-500)] hover:bg-[var(--color-forest-400)] text-white rounded-full flex items-center justify-center transition-transform hover:scale-105 shadow-xl"
        >
          {isPlaying ? <Pause size={48} /> : <Play size={48} className="ml-2" />}
        </button>
      </main>

      <footer className="p-8 text-center text-[var(--color-forest-300)] font-medium">
        Playing Chapter 1: Introduction & Urban Forests
      </footer>
    </div>
  );
}
