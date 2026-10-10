import type { Article, Episode } from '../types';

export const SAMPLE_ARTICLES: Article[] = [
  {
    id: 'art_1',
    title: 'The Hidden Architecture of Urban Forests',
    domain: 'nature-magazine.com',
    topic: 'Environment',
    excerpt: 'How city planners are using ancient forest principles to cool modern megacities.',
    dateAdded: '2023-10-09T10:00:00Z',
  },
  {
    id: 'art_2',
    title: 'CSS Grid vs Flexbox: The Ultimate Guide',
    domain: 'frontend-weekly.net',
    topic: 'Technology',
    excerpt: 'A comprehensive breakdown of when to use which layout system for modern web applications.',
    dateAdded: '2023-10-08T14:30:00Z',
  },
  {
    id: 'art_3',
    title: 'The Psychology of Habit Loops',
    domain: 'mind-journal.org',
    topic: 'Psychology',
    excerpt: 'Understanding the cue-routine-reward cycle that drives our daily behaviors.',
    dateAdded: '2023-10-07T09:15:00Z',
  },
  {
    id: 'art_4',
    title: 'History of the Espresso Machine',
    domain: 'coffee-culture.co',
    topic: 'History',
    excerpt: 'From early steam pressure experiments to the modern 9-bar pump systems.',
    dateAdded: '2023-10-06T16:45:00Z',
  }
];

export const MOCK_EPISODE: Episode = {
  id: 'ep_mock_1',
  title: 'Morning Walk: Tech & Nature',
  status: 'ready',
  duration: 485, // 8m 5s
  targetDurationMinutes: 10,
  narrationStyle: 'conversational',
  chapters: [
    {
      id: 'ch_1',
      title: 'Introduction & Urban Forests',
      startTime: 0,
      duration: 210,
      sourceArticleId: 'art_1'
    },
    {
      id: 'ch_2',
      title: 'Deep Dive: Habit Loops',
      startTime: 210,
      duration: 275,
      sourceArticleId: 'art_3'
    }
  ]
};
