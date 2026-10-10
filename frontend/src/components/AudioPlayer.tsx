import { useState, useEffect, useRef } from 'react';
import type { Episode, Article } from '../types';
import { SkipBack, SkipForward, Maximize2, Map, BookOpen, Clock, Play, Pause, Headphones } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AudioPlayerProps {
  episode: Episode | null;
  setEpisode: (ep: Episode | null) => void;
  onEnterTrailMode: () => void;
}

export default function AudioPlayer({ episode, setEpisode, onEnterTrailMode }: AudioPlayerProps) {
  const [trails, setTrails] = useState<Episode[]>([]);
  const [currentChapterIndex, setCurrentChapterIndex] = useState(0);
  const [currentArticle, setCurrentArticle] = useState<Article | null>(null);
  const [isLoadingArticle, setIsLoadingArticle] = useState(false);
  
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState('');
  
  const [isGeneratingTakeaways, setIsGeneratingTakeaways] = useState(false);
  const [takeawaysError, setTakeawaysError] = useState('');
  
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [audioError, setAudioError] = useState('');
  
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);

  const loadChapter = async (index: number) => {
    if (!episode || index < 0 || index >= episode.chapters.length) return;
    setCurrentChapterIndex(index);
    localStorage.setItem(`trail_progress_${episode.id}`, index.toString());
    setIsLoadingArticle(true);
    setCurrentArticle(null);
    setSummaryError('');
    setTakeawaysError('');
    try {
      const artId = episode.chapters[index].sourceArticleId;
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/articles/${artId}`);
      if (res.ok) {
        const art: Article = await res.json();
        setCurrentArticle(art);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingArticle(false);
    }
  };

  const handleGenerateSummary = async (force: boolean = false) => {
    if (!currentArticle) return;
    setIsGeneratingSummary(true);
    setSummaryError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/articles/${currentArticle.id}/summary${force ? '?force=true' : ''}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to generate summary');
      }
      const updatedArticle = await res.json();
      setCurrentArticle(updatedArticle);
    } catch (err: any) {
      setSummaryError(err.message);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateTakeaways = async (force: boolean = false) => {
    if (!currentArticle) return;
    setIsGeneratingTakeaways(true);
    setTakeawaysError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/articles/${currentArticle.id}/takeaways${force ? '?force=true' : ''}`, {
        method: 'POST'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to generate takeaways');
      }
      const updatedArticle = await res.json();
      setCurrentArticle(updatedArticle);
    } catch (err: any) {
      setTakeawaysError(err.message);
    } finally {
      setIsGeneratingTakeaways(false);
    }
  };
  
  const handleGenerateAudio = async () => {
    if (!episode) return;
    setIsGeneratingAudio(true);
    setAudioError('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/trails/${episode.id}/audio`, {
        method: 'POST'
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || 'Failed to generate audio');
      }
      const updatedEpisode = await res.json();
      setEpisode(updatedEpisode);
    } catch (err: any) {
      setAudioError(err.message);
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const togglePlay = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setAudioDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  useEffect(() => {
    if (!episode) {
      fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000'}/api/trails`)
        .then(res => res.json())
        .then(data => setTrails(data))
        .catch(err => console.error(err));
    } else {
      const savedIndex = localStorage.getItem(`trail_progress_${episode.id}`);
      loadChapter(savedIndex ? parseInt(savedIndex, 10) : 0);
    }
  }, [episode]);

  const handleNext = () => {
    if (episode && currentChapterIndex < episode.chapters.length - 1) {
      loadChapter(currentChapterIndex + 1);
    }
  };

  const handlePrev = () => {
    if (episode && currentChapterIndex > 0) {
      loadChapter(currentChapterIndex - 1);
    }
  };

  if (!episode) {
    return (
      <div className="max-w-4xl mx-auto p-8 h-full flex flex-col">
        <h1 className="text-3xl font-bold tracking-tight mb-8">My Trails</h1>
        {trails.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-[var(--color-text-secondary)]">
            <Map size={48} className="mb-4 text-[var(--color-sand-300)]" />
            <h2 className="text-xl font-medium mb-2 text-[var(--color-text-primary)]">No active trails</h2>
            <p>Go to your Library to select sources and generate an audio trail.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {trails.map(t => (
              <div 
                key={t.id} 
                onClick={() => setEpisode(t)}
                className="bg-[var(--color-surface-card)] p-6 rounded-2xl border-2 border-[var(--color-sand-200)] hover:border-[var(--color-forest-500)] cursor-pointer transition-colors shadow-sm"
              >
                <div className="flex justify-between items-start mb-4">
                  <h3 className="font-bold text-xl leading-tight">{t.title}</h3>
                  <div className="bg-[var(--color-forest-50)] text-[var(--color-forest-800)] px-3 py-1 rounded-full text-xs font-bold uppercase">
                    {t.status}
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-[var(--color-text-secondary)] mb-4">
                  <span className="flex items-center gap-1"><Clock size={16} /> {Math.round(t.duration / 60)} min</span>
                  <span className="flex items-center gap-1"><BookOpen size={16} /> {t.chapters.length} articles</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  const currentChapter = episode.chapters[currentChapterIndex];

  return (
    <div className="max-w-5xl mx-auto p-8 h-full flex flex-col">
      <div className="flex justify-between items-center mb-8">
        <div>
          <button 
            onClick={() => setEpisode(null)}
            className="text-sm font-medium text-[var(--color-forest-600)] hover:underline mb-1 inline-block"
          >
            ← Back to Trails
          </button>
          <h1 className="text-3xl font-bold tracking-tight">{episode.title}</h1>
        </div>
        <button 
          onClick={onEnterTrailMode}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--color-surface-card)] hover:bg-[var(--color-sand-100)] border border-[var(--color-sand-200)] rounded-lg font-medium transition-colors"
        >
          <Maximize2 size={16} />
          Trail Mode
        </button>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        
        {/* Reading Pane */}
        <div className="flex-1 bg-white rounded-3xl p-8 shadow-sm border border-[var(--color-sand-200)] overflow-y-auto">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">{currentChapter.title}</h2>
            {isLoadingArticle ? (
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-[var(--color-sand-200)] rounded w-3/4"></div>
                <div className="h-4 bg-[var(--color-sand-200)] rounded w-full"></div>
                <div className="h-4 bg-[var(--color-sand-200)] rounded w-5/6"></div>
              </div>
            ) : currentArticle ? (
              <>
                <div className="mb-8 flex flex-col gap-4">
                  <div className="p-6 bg-[var(--color-sand-50)] rounded-2xl border border-[var(--color-sand-200)]">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-[var(--color-forest-800)] flex items-center gap-2">
                        <span className="text-2xl">✨</span> AI Summary
                      </h3>
                      <button 
                        onClick={() => handleGenerateSummary(!!currentArticle.summary)}
                        disabled={isGeneratingSummary}
                        className="text-sm px-3 py-1 bg-white border border-[var(--color-sand-200)] rounded-lg hover:bg-[var(--color-sand-100)] transition-colors disabled:opacity-50"
                      >
                        {isGeneratingSummary ? 'Generating...' : currentArticle.summary ? 'Regenerate' : 'Generate'}
                      </button>
                    </div>
                    {summaryError && (
                      <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                        {summaryError}
                      </div>
                    )}
                    {currentArticle.summary && !isGeneratingSummary ? (
                      <div className="text-[var(--color-text-primary)] leading-relaxed prose prose-sm">
                        <ReactMarkdown>{currentArticle.summary}</ReactMarkdown>
                      </div>
                    ) : !isGeneratingSummary && (
                      <p className="text-sm text-[var(--color-text-secondary)] italic">
                        No summary available yet. Click generate to create one.
                      </p>
                    )}
                  </div>

                  <div className="p-6 bg-[var(--color-sand-50)] rounded-2xl border border-[var(--color-sand-200)]">
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="text-lg font-bold text-[var(--color-forest-800)] flex items-center gap-2">
                        <span className="text-2xl">💡</span> Key Takeaways
                      </h3>
                      <button 
                        onClick={() => handleGenerateTakeaways(!!currentArticle.takeaways)}
                        disabled={isGeneratingTakeaways}
                        className="text-sm px-3 py-1 bg-white border border-[var(--color-sand-200)] rounded-lg hover:bg-[var(--color-sand-100)] transition-colors disabled:opacity-50"
                      >
                        {isGeneratingTakeaways ? 'Generating...' : currentArticle.takeaways ? 'Regenerate' : 'Generate'}
                      </button>
                    </div>
                    {takeawaysError && (
                      <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-lg border border-red-100">
                        {takeawaysError}
                      </div>
                    )}
                    {currentArticle.takeaways && !isGeneratingTakeaways ? (
                      <div className="text-[var(--color-text-primary)] leading-relaxed prose prose-sm prose-ul:pl-4 prose-li:marker:text-[var(--color-forest-500)]">
                        <ReactMarkdown>{currentArticle.takeaways}</ReactMarkdown>
                      </div>
                    ) : !isGeneratingTakeaways && (
                      <p className="text-sm text-[var(--color-text-secondary)] italic">
                        No takeaways available yet. Click generate to create them.
                      </p>
                    )}
                  </div>
                </div>

                <div className="prose prose-lg prose-p:leading-relaxed prose-p:mb-6 text-[var(--color-text-secondary)]">
                  {(currentArticle.extracted_text || 'No text extracted.').split('\n').map((para, i) => (
                    <p key={i}>{para}</p>
                  ))}
                </div>
              </>
            ) : (
              <p>Failed to load article content.</p>
            )}
          </div>
        </div>

        {/* Sidebar: Playback & Chapters */}
        <div className="w-80 flex flex-col gap-6">
          <div className="bg-[var(--color-surface-card)] rounded-3xl p-6 shadow-sm border border-[var(--color-sand-200)]">
            <h3 className="font-bold mb-4 text-lg">Audio Playback</h3>
            {episode.audioUrl ? (
              <div className="flex flex-col gap-4">
                <audio 
                  ref={audioRef}
                  src={`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000"}${episode.audioUrl}`}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  onError={() => setAudioError('Error loading audio file')}
                />
                
                <div className="flex justify-center mb-2">
                  <button 
                    onClick={togglePlay}
                    className="bg-[var(--color-forest-600)] text-white p-4 rounded-full hover:bg-[var(--color-forest-700)] transition-colors shadow-md"
                  >
                    {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
                  </button>
                </div>
                
                <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-text-secondary)]">
                  <span>{formatTime(currentTime)}</span>
                  <input 
                    type="range" 
                    min="0" 
                    max={audioDuration || 100} 
                    value={currentTime} 
                    onChange={handleSeek}
                    className="flex-1 h-2 bg-[var(--color-sand-200)] rounded-lg appearance-none cursor-pointer accent-[var(--color-forest-600)]"
                  />
                  <span>{formatTime(audioDuration)}</span>
                </div>
                
                {audioError && (
                  <div className="text-xs text-red-600 mt-2 p-2 bg-red-50 rounded border border-red-100">
                    {audioError}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-4 bg-[var(--color-sand-50)] rounded-xl border border-[var(--color-sand-200)] text-center">
                <Headphones size={32} className="text-[var(--color-sand-400)] mb-3" />
                <p className="text-sm text-[var(--color-text-secondary)] mb-4">No audio generated for this trail yet.</p>
                <button 
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio}
                  className="px-4 py-2 bg-[var(--color-forest-600)] text-white text-sm font-medium rounded-lg hover:bg-[var(--color-forest-700)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2 w-full"
                >
                  {isGeneratingAudio ? 'Generating Test Audio...' : 'Generate Test Audio'}
                </button>
                {audioError && (
                   <p className="text-xs text-red-600 mt-2">{audioError}</p>
                )}
              </div>
            )}
          </div>

          <div className="bg-[var(--color-surface-card)] rounded-3xl p-6 shadow-sm border border-[var(--color-sand-200)]">
            <h3 className="font-bold mb-4 text-lg">Trail Progress</h3>
            <div className="flex items-center justify-between gap-4 mb-4">
              <button 
                disabled={currentChapterIndex === 0}
                onClick={handlePrev}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30"
              >
                <SkipBack size={24} />
              </button>
              <div className="text-sm font-medium text-center">
                Article {currentChapterIndex + 1} of {episode.chapters.length}
              </div>
              <button 
                disabled={currentChapterIndex === episode.chapters.length - 1}
                onClick={handleNext}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] disabled:opacity-30"
              >
                <SkipForward size={24} />
              </button>
            </div>
            {/* Overall progress visual */}
            <div className="h-2 bg-[var(--color-sand-200)] rounded-full overflow-hidden">
               <div 
                 className="h-full bg-[var(--color-forest-600)] transition-all"
                 style={{ width: `${((currentChapterIndex + 1) / episode.chapters.length) * 100}%` }}
               ></div>
            </div>
          </div>

          <div className="bg-[var(--color-surface-card)] rounded-3xl p-6 shadow-sm border border-[var(--color-sand-200)] flex-1 overflow-y-auto">
            <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-[var(--color-text-secondary)]">Articles in Trail</h3>
            <div className="space-y-3">
              {episode.chapters.map((ch, idx) => (
                <div 
                  key={ch.id} 
                  onClick={() => loadChapter(idx)}
                  className={`flex flex-col text-sm p-3 rounded-xl cursor-pointer transition-colors ${
                    idx === currentChapterIndex 
                      ? 'bg-[var(--color-forest-50)] border border-[var(--color-forest-200)]' 
                      : 'hover:bg-[var(--color-sand-100)] border border-transparent'
                  }`}
                >
                  <span className={`font-medium ${idx === currentChapterIndex ? 'text-[var(--color-forest-800)]' : 'text-[var(--color-text-primary)]'}`}>
                    <span className="text-[var(--color-text-tertiary)] mr-2">{String(idx + 1).padStart(2, '0')}</span>
                    {ch.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
