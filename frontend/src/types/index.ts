export interface Article {
  id: string;
  title: string;
  domain: string;
  topic: string;
  excerpt: string;
  dateAdded: string;
  selected?: boolean;
  extracted_text?: string;
  summary?: string;
  takeaways?: string;
}

export interface Chapter {
  id: string;
  title: string;
  startTime: number; // in seconds
  duration: number; // in seconds
  sourceArticleId: string;
}

export interface Episode {
  id: string;
  title: string;
  status: 'idle' | 'generating' | 'ready';
  duration: number; // total duration in seconds
  chapters: Chapter[];
  narrationStyle: 'informative' | 'conversational' | 'storytelling';
  targetDurationMinutes: number;
  audioUrl?: string;
}
