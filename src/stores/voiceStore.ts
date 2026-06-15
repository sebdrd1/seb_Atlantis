import { create } from 'zustand';
import type { VoiceState, PomodoroState } from '../types';

interface VoiceStoreState extends VoiceState {
  setListening: (listening: boolean) => void;
  setSpeaking: (speaking: boolean) => void;
  setTranscript: (transcript: string) => void;
  setInterimTranscript: (transcript: string) => void;
  setLanguage: (lang: 'fr-FR' | 'en-US') => void;
  setVoiceEnabled: (enabled: boolean) => void;
  appendTranscript: (text: string) => void;
  clearTranscript: () => void;
}

export const useVoiceStore = create<VoiceStoreState>((set) => ({
  isListening: false,
  isSpeaking: false,
  transcript: '',
  interimTranscript: '',
  language: 'fr-FR',
  voiceEnabled: true,

  setListening: (listening) => set({ isListening: listening }),
  setSpeaking: (speaking) => set({ isSpeaking: speaking }),
  setTranscript: (transcript) => set({ transcript }),
  setInterimTranscript: (transcript) => set({ interimTranscript: transcript }),
  setLanguage: (lang) => set({ language: lang }),
  setVoiceEnabled: (enabled) => set({ voiceEnabled: enabled }),
  appendTranscript: (text) =>
    set((state) => ({ transcript: state.transcript + text })),
  clearTranscript: () => set({ transcript: '', interimTranscript: '' }),
}));

interface PomodoroStoreState extends PomodoroState {
  start: (task?: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  tick: () => void;
  startBreak: () => void;
  setTask: (task: string) => void;
  reset: () => void;
}

const DEFAULT_POMODORO_DURATION = 25 * 60; // 25 min
const DEFAULT_BREAK_DURATION = 5 * 60; // 5 min

export const usePomodoroStore = create<PomodoroStoreState>((set, get) => ({
  isRunning: false,
  isBreak: false,
  timeRemaining: DEFAULT_POMODORO_DURATION,
  totalTime: DEFAULT_POMODORO_DURATION,
  sessionsCompleted: 0,
  currentTask: '',

  start: (task) =>
    set({
      isRunning: true,
      isBreak: false,
      timeRemaining: DEFAULT_POMODORO_DURATION,
      totalTime: DEFAULT_POMODORO_DURATION,
      currentTask: task || get().currentTask,
    }),

  pause: () => set({ isRunning: false }),

  resume: () => set({ isRunning: true }),

  stop: () =>
    set({
      isRunning: false,
      isBreak: false,
      timeRemaining: DEFAULT_POMODORO_DURATION,
      totalTime: DEFAULT_POMODORO_DURATION,
    }),

  tick: () => {
    const state = get();
    if (!state.isRunning || state.timeRemaining <= 0) return;

    const newTime = state.timeRemaining - 1;
    if (newTime <= 0) {
      if (state.isBreak) {
        // Break finished → back to work
        set({
          isRunning: false,
          isBreak: false,
          timeRemaining: DEFAULT_POMODORO_DURATION,
          totalTime: DEFAULT_POMODORO_DURATION,
        });
      } else {
        // Work session finished → start break
        set({
          isRunning: false,
          isBreak: true,
          timeRemaining: DEFAULT_BREAK_DURATION,
          totalTime: DEFAULT_BREAK_DURATION,
          sessionsCompleted: state.sessionsCompleted + 1,
        });
      }
    } else {
      set({ timeRemaining: newTime });
    }
  },

  startBreak: () =>
    set({
      isRunning: true,
      isBreak: true,
      timeRemaining: DEFAULT_BREAK_DURATION,
      totalTime: DEFAULT_BREAK_DURATION,
    }),

  setTask: (task) => set({ currentTask: task }),

  reset: () =>
    set({
      isRunning: false,
      isBreak: false,
      timeRemaining: DEFAULT_POMODORO_DURATION,
      totalTime: DEFAULT_POMODORO_DURATION,
      sessionsCompleted: 0,
      currentTask: '',
    }),
}));
