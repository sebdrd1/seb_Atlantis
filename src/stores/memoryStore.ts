import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { MemoryEntry, MemorySearchResult } from '../types';

interface MemoryState {
  entries: MemoryEntry[];
  searchQuery: string;
  selectedTags: string[];
  loading: boolean;
  error: string | null;

  // CRUD
  addEntry: (entry: Omit<MemoryEntry, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEntry: (id: string, updates: Partial<MemoryEntry>) => void;
  deleteEntry: (id: string) => void;

  // Search (FTS-like)
  setSearchQuery: (query: string) => void;
  toggleTag: (tag: string) => void;
  search: (query: string) => MemorySearchResult[];
  getFilteredEntries: () => MemoryEntry[];

  // Helpers
  getAllTags: () => string[];
  getEntriesBySource: (source: string) => MemoryEntry[];
  clearError: () => void;

  // Auto-memory from conversation
  autoSaveFromMessage: (content: string, source: string, agentId?: string) => void;
}

export const useMemoryStore = create<MemoryState>()(
  persist(
    (set, get) => ({
      entries: [],
      searchQuery: '',
      selectedTags: [],
      loading: false,
      error: null,

      addEntry: (entry) => {
        const now = Date.now();
        const newEntry: MemoryEntry = {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: now,
          updatedAt: now,
        };
        set((state) => ({ entries: [newEntry, ...state.entries] }));
      },

      updateEntry: (id, updates) =>
        set((state) => ({
          entries: state.entries.map((e) =>
            e.id === id ? { ...e, ...updates, updatedAt: Date.now() } : e
          ),
        })),

      deleteEntry: (id) =>
        set((state) => ({
          entries: state.entries.filter((e) => e.id !== id),
        })),

      setSearchQuery: (query) => set({ searchQuery: query }),

      toggleTag: (tag) =>
        set((state) => ({
          selectedTags: state.selectedTags.includes(tag)
            ? state.selectedTags.filter((t) => t !== tag)
            : [...state.selectedTags, tag],
        })),

      search: (query: string): MemorySearchResult[] => {
        const { entries } = get();
        if (!query.trim()) return [];

        const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
        const results: MemorySearchResult[] = [];

        for (const entry of entries) {
          const searchable = `${entry.key} ${entry.value} ${entry.tags.join(' ')}`.toLowerCase();
          let score = 0;
          let allMatch = true;

          for (const term of terms) {
            if (searchable.includes(term)) {
              // Higher score for key matches
              if (entry.key.toLowerCase().includes(term)) score += 3;
              else if (entry.value.toLowerCase().includes(term)) score += 1;
              else if (entry.tags.some((t) => t.toLowerCase().includes(term))) score += 2;
            } else {
              allMatch = false;
            }
          }

          if (allMatch && score > 0) {
            // Create snippet
            const idx = entry.value.toLowerCase().indexOf(terms[0]);
            const start = Math.max(0, idx - 40);
            const end = Math.min(entry.value.length, idx + 100);
            const snippet = (start > 0 ? '...' : '') + entry.value.slice(start, end) + (end < entry.value.length ? '...' : '');

            results.push({ entry, score, snippet });
          }
        }

        return results.sort((a, b) => b.score - a.score);
      },

      getFilteredEntries: () => {
        const { entries, searchQuery, selectedTags } = get();
        return entries.filter((entry) => {
          const matchesSearch =
            !searchQuery ||
            entry.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.value.toLowerCase().includes(searchQuery.toLowerCase()) ||
            entry.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
          const matchesTags =
            selectedTags.length === 0 || selectedTags.every((t) => entry.tags.includes(t));
          return matchesSearch && matchesTags;
        });
      },

      getAllTags: () => {
        const tags = new Set<string>();
        get().entries.forEach((e) => e.tags.forEach((t) => tags.add(t)));
        return Array.from(tags).sort();
      },

      getEntriesBySource: (source) => {
        return get().entries.filter((e) => e.source === source);
      },

      clearError: () => set({ error: null }),

      autoSaveFromMessage: (content, source, agentId) => {
        // Auto-extract key info from messages
        // Only save if content looks important (contains code, commands, or key-value patterns)
        const lines = content.split('\n');
        const importantLines = lines.filter(
          (l) =>
            l.includes('```') ||
            l.includes('=') ||
            l.includes(':') ||
            l.startsWith('- ') ||
            l.match(/^\d+\./) ||
            l.includes('command') ||
            l.includes('config') ||
            l.includes('error') ||
            l.includes('solution')
        );

        if (importantLines.length >= 3) {
          const key = `auto-${source}-${Date.now()}`;
          get().addEntry({
            key,
            value: importantLines.join('\n'),
            tags: ['auto', source, ...(agentId ? [agentId] : [])],
            source,
            importance: 2,
          });
        }
      },
    }),
    {
      name: 'seb-atlantis-memory-v4',
      storage: createJSONStorage(() => localStorage),
      version: 4,
      partialize: (state) => ({
        entries: state.entries,
        searchQuery: state.searchQuery,
        selectedTags: state.selectedTags,
      }),
    }
  )
);
