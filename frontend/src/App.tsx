import { useState, useEffect } from 'react';
import type { Article, Episode } from './types';
import { SAMPLE_ARTICLES } from './data/sampleData';

import Sidebar from './components/Sidebar';
import SourceLibrary from './components/SourceLibrary';
import EpisodeSetup from './components/EpisodeSetup';
import GenerationScreen from './components/GenerationScreen';
import AudioPlayer from './components/AudioPlayer';
import TrailMode from './components/TrailMode';
import Settings from './components/Settings';

type ViewState = 'dashboard' | 'setup' | 'generating' | 'player' | 'trail-mode' | 'settings';

function App() {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  const [importedArticles, setImportedArticles] = useState<Article[]>([]);
  const [sampleArticles, setSampleArticles] = useState<Article[]>(SAMPLE_ARTICLES);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchImported = async () => {
    setIsFetching(true);
    setFetchError(null);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/articles`);
      if (!res.ok) throw new Error('Failed to fetch from backend');
      const data = await res.json();
      
      // Preserve selection state if already fetched
      const merged = data.map((art: Article) => {
        const existing = importedArticles.find(a => a.id === art.id);
        return existing ? { ...art, selected: existing.selected } : art;
      });
      setImportedArticles(merged);
    } catch (err) {
      console.error(err);
      setFetchError('Could not connect to local backend. Ensure it is running.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (currentView === 'dashboard') {
      fetchImported();
    }
  }, [currentView]);

  const toggleImportedSelection = (id: string) => {
    setImportedArticles(importedArticles.map(art => 
      art.id === id ? { ...art, selected: !art.selected } : art
    ));
  };

  const toggleSampleSelection = (id: string) => {
    setSampleArticles(sampleArticles.map(art => 
      art.id === id ? { ...art, selected: !art.selected } : art
    ));
  };

  const selectedArticles = [...importedArticles, ...sampleArticles].filter(a => a.selected);

  const handleStartGeneration = async (title: string, style: string, duration: number, articleIds: string[]) => {
    setCurrentView('generating');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/trails`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          narrationStyle: style,
          targetDurationMinutes: duration,
          articleIds
        })
      });
      if (!res.ok) throw new Error('Failed to create trail');
      const trail = await res.json();
      setEpisode(trail);
      // Brief simulated generation screen for UI flow
      setTimeout(() => setCurrentView('player'), 1500);
    } catch (err) {
      console.error(err);
      alert('Failed to save trail.');
      setCurrentView('dashboard');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-surface-bg)] text-[var(--color-text-primary)]">
      {currentView !== 'trail-mode' && (
        <Sidebar currentView={currentView} onNavigate={setCurrentView} />
      )}
      
      <main className="flex-1 overflow-y-auto relative">
        {currentView === 'dashboard' && (
          <div className="max-w-5xl mx-auto p-8">
            <header className="mb-8 flex justify-between items-end">
              <div>
                <h1 className="text-3xl font-bold tracking-tight mb-2">Source Library</h1>
                <p className="text-[var(--color-text-secondary)]">
                  {selectedArticles.length} articles selected for your next trail.
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={fetchImported}
                  className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors font-medium text-sm border border-[var(--color-sand-200)] px-4 py-2 rounded-xl bg-white shadow-sm"
                >
                  {isFetching ? 'Syncing...' : 'Sync Extension Imports'}
                </button>
                <button 
                  disabled={selectedArticles.length === 0}
                  onClick={() => setCurrentView('setup')}
                  className="bg-[var(--color-forest-600)] hover:bg-[var(--color-forest-700)] text-white px-6 py-3 rounded-xl font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create a trail
                </button>
              </div>
            </header>

            {fetchError && (
              <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
                {fetchError}
              </div>
            )}
            
            <div className="mb-12">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Imported from Firefox
                <span className="text-xs font-normal bg-[var(--color-forest-100)] text-[var(--color-forest-800)] px-2 py-0.5 rounded-full">
                  Real Data
                </span>
              </h2>
              {importedArticles.length === 0 ? (
                <div className="p-8 text-center border-2 border-dashed border-[var(--color-sand-200)] rounded-2xl text-[var(--color-text-secondary)]">
                  Use the Tabs to Trails Firefox extension to import real articles into your library.
                </div>
              ) : (
                <SourceLibrary 
                  articles={importedArticles} 
                  onToggleSelect={toggleImportedSelection} 
                />
              )}
            </div>

            <div>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                Demo Content
                <span className="text-xs font-normal bg-[var(--color-sand-200)] text-[var(--color-text-secondary)] px-2 py-0.5 rounded-full">
                  Sample Data
                </span>
              </h2>
              <SourceLibrary 
                articles={sampleArticles} 
                onToggleSelect={toggleSampleSelection} 
              />
            </div>
          </div>
        )}

        {currentView === 'setup' && (
          <EpisodeSetup 
            selectedArticles={selectedArticles}
            onCancel={() => setCurrentView('dashboard')}
            onStart={handleStartGeneration}
          />
        )}

        {currentView === 'generating' && (
          <GenerationScreen />
        )}

        {currentView === 'player' && (
          <AudioPlayer 
            episode={episode}
            setEpisode={setEpisode}
            onEnterTrailMode={() => setCurrentView('trail-mode')} 
          />
        )}

        {currentView === 'trail-mode' && episode && (
          <TrailMode 
            episode={episode} 
            onExit={() => setCurrentView('player')} 
          />
        )}

        {currentView === 'settings' && (
          <Settings />
        )}
      </main>
    </div>
  );
}

export default App;
