
import type { Article } from '../types';
import { CheckCircle2, Circle, Clock, Globe } from 'lucide-react';

interface SourceLibraryProps {
  articles: Article[];
  onToggleSelect: (id: string) => void;
}

export default function SourceLibrary({ articles, onToggleSelect }: SourceLibraryProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {articles.map(article => (
        <div 
          key={article.id}
          onClick={() => onToggleSelect(article.id)}
          className={`relative p-5 rounded-2xl border-2 transition-all cursor-pointer bg-[var(--color-surface-card)] hover:shadow-md ${
            article.selected 
              ? 'border-[var(--color-forest-500)] ring-4 ring-[var(--color-forest-50)]' 
              : 'border-[var(--color-sand-200)] hover:border-[var(--color-sand-300)]'
          }`}
        >
          <div className="absolute top-4 right-4">
            {article.selected ? (
              <CheckCircle2 className="text-[var(--color-forest-500)] fill-[var(--color-forest-50)]" size={24} />
            ) : (
              <Circle className="text-[var(--color-sand-300)]" size={24} />
            )}
          </div>
          
          <div className="pr-8 mb-4">
            <span className="inline-block px-2.5 py-1 bg-[var(--color-surface-bg)] text-[var(--color-text-secondary)] text-xs font-medium uppercase tracking-wider rounded-md mb-3">
              {article.topic}
            </span>
            <h3 className="font-bold text-lg leading-tight mb-2 text-[var(--color-text-primary)]">
              {article.title}
            </h3>
            <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">
              {article.excerpt}
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--color-text-tertiary)] pt-4 border-t border-[var(--color-sand-100)]">
            <div className="flex items-center gap-1.5">
              <Globe size={14} />
              <span>{article.domain}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock size={14} />
              <span>{new Date(article.dateAdded).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
