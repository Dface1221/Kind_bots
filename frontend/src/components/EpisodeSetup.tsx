import { useState } from 'react';
import type { Article } from '../types';
import { ArrowLeft, Clock, Mic, Wand2, GripVertical, ChevronUp, ChevronDown } from 'lucide-react';

interface EpisodeSetupProps {
  selectedArticles: Article[];
  onCancel: () => void;
  onStart: (title: string, style: string, duration: number, articleIds: string[]) => void;
}

export default function EpisodeSetup({ selectedArticles, onCancel, onStart }: EpisodeSetupProps) {
  const [duration, setDuration] = useState(15);
  const [style, setStyle] = useState('conversational');
  const [title, setTitle] = useState('');
  const [orderedArticles, setOrderedArticles] = useState<Article[]>(selectedArticles);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionRationale, setSuggestionRationale] = useState('');

  const moveUp = (index: number) => {
    if (index === 0) return;
    const newOrder = [...orderedArticles];
    [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
    setOrderedArticles(newOrder);
  };

  const moveDown = (index: number) => {
    if (index === orderedArticles.length - 1) return;
    const newOrder = [...orderedArticles];
    [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
    setOrderedArticles(newOrder);
  };

  const handleSuggestOrder = async () => {
    if (orderedArticles.length < 2) return;
    setIsSuggesting(true);
    setSuggestionRationale('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/trails/suggest-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ articleIds: orderedArticles.map(a => a.id) })
      });
      if (!res.ok) throw new Error('Failed to suggest order');
      const data = await res.json();
      
      const newOrder = data.suggestedOrder.map((id: string) => orderedArticles.find(a => a.id === id)).filter(Boolean) as Article[];
      if (newOrder.length === orderedArticles.length) {
        setOrderedArticles(newOrder);
        setSuggestionRationale(data.rationale);
      }
    } catch (err) {
      console.error(err);
      alert('Could not suggest order. Try again later.');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleGenerate = () => {
    if (!title.trim()) {
      alert('Please enter a title for your Trail.');
      return;
    }
    onStart(title, style, duration, orderedArticles.map(a => a.id));
  };

  return (
    <div className="max-w-2xl mx-auto p-8">
      <button 
        onClick={onCancel}
        className="flex items-center gap-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] mb-8 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Library
      </button>

      <h1 className="text-3xl font-bold tracking-tight mb-8">Trail Setup</h1>

      <div className="bg-[var(--color-surface-card)] rounded-2xl p-8 border border-[var(--color-sand-200)] shadow-sm space-y-10">
        
        {/* Title */}
        <div>
          <h3 className="font-semibold text-lg mb-4">Trail Title</h3>
          <input 
            type="text" 
            placeholder="e.g. Morning Tech Catchup"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-4 rounded-xl border border-[var(--color-sand-200)] focus:border-[var(--color-forest-500)] outline-none font-medium"
          />
        </div>

        {/* Reordering */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Article Order</h3>
            <div className="flex items-center gap-3">
              {orderedArticles.length > 1 && (
                <button 
                  onClick={handleSuggestOrder}
                  disabled={isSuggesting}
                  className="flex items-center gap-1 text-sm bg-white border border-[var(--color-sand-200)] hover:bg-[var(--color-sand-100)] px-3 py-1.5 rounded-lg transition-colors font-medium text-[var(--color-forest-800)] disabled:opacity-50"
                >
                  <Wand2 size={14} />
                  {isSuggesting ? 'Thinking...' : 'AI Suggest Order'}
                </button>
              )}
              <span className="bg-[var(--color-forest-100)] text-[var(--color-forest-800)] px-3 py-1 rounded-lg text-sm font-medium">
                {orderedArticles.length} selected
              </span>
            </div>
          </div>
          
          {suggestionRationale && (
            <div className="mb-4 p-4 bg-[var(--color-forest-50)] rounded-xl text-sm text-[var(--color-forest-800)] border border-[var(--color-forest-200)]">
              <span className="font-semibold block mb-1">AI Recommendation:</span>
              {suggestionRationale}
            </div>
          )}
          <div className="space-y-2">
            {orderedArticles.map((art, idx) => (
              <div key={art.id} className="flex items-center gap-3 bg-[var(--color-surface-bg)] p-3 rounded-xl border border-[var(--color-sand-100)]">
                <GripVertical size={16} className="text-[var(--color-sand-300)]" />
                <span className="flex-1 font-medium truncate">{art.title}</span>
                <div className="flex flex-col">
                  <button disabled={idx === 0} onClick={() => moveUp(idx)} className="p-1 hover:text-[var(--color-forest-600)] disabled:opacity-30">
                    <ChevronUp size={16} />
                  </button>
                  <button disabled={idx === orderedArticles.length - 1} onClick={() => moveDown(idx)} className="p-1 hover:text-[var(--color-forest-600)] disabled:opacity-30">
                    <ChevronDown size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Duration */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="text-[var(--color-forest-600)]" size={20} />
            <h3 className="font-semibold text-lg">Target Duration</h3>
          </div>
          <div className="flex items-center gap-4">
            <input 
              type="range" 
              min="5" 
              max="60" 
              step="5"
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="flex-1 h-2 bg-[var(--color-sand-200)] rounded-lg appearance-none cursor-pointer accent-[var(--color-forest-600)]"
            />
            <span className="w-16 text-right font-medium text-lg">{duration}m</span>
          </div>
        </div>

        {/* Style */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Mic className="text-[var(--color-forest-600)]" size={20} />
            <h3 className="font-semibold text-lg">Narration Style</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {['informative', 'conversational', 'storytelling'].map((s) => (
              <button
                key={s}
                onClick={() => setStyle(s)}
                className={`p-4 rounded-xl border-2 transition-all capitalize font-medium ${
                  style === s 
                    ? 'border-[var(--color-forest-500)] bg-[var(--color-forest-50)] text-[var(--color-forest-800)]' 
                    : 'border-[var(--color-sand-200)] hover:border-[var(--color-sand-300)] text-[var(--color-text-secondary)]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Action */}
        <div className="pt-6 border-t border-[var(--color-sand-200)]">
          <button 
            onClick={handleGenerate}
            className="w-full flex items-center justify-center gap-2 bg-[var(--color-text-primary)] hover:bg-black text-white py-4 rounded-xl font-bold text-lg transition-colors"
          >
            <Wand2 size={20} />
            Save Trail
          </button>
        </div>

      </div>
    </div>
  );
}
