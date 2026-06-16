import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Settings, ProviderId, VPSConfig } from '../types';

const ALL_PROVIDERS: ProviderId[] = [
  'openrouter', 'huggingface', 'google', 'anthropic', 'openai',
  'together', 'groq', 'cohere', 'mistral', 'perplexity', 'xai', 'ollama',
];

const defaultSettings: Settings = {
  apiKeys: ALL_PROVIDERS.map(p => ({ provider: p, key: '', enabled: false })),
  defaultModel: 'google/gemma-3-27b-it:free',
  defaultProvider: 'openrouter',
  theme: 'dark',
  language: 'fr',
  autoSave: true,
  notifications: true,
  voiceEnabled: true,
  voiceLanguage: 'fr-FR',
  adhdMode: false,
  skillAutoGenerate: true,
  orchestratorEnabled: true,
};

interface SettingsState extends Settings {
  vpsConfigs: VPSConfig[];

  setApiKey: (provider: ProviderId, key: string) => void;
  toggleProvider: (provider: ProviderId, enabled: boolean) => void;
  setDefaultModel: (model: string) => void;
  setDefaultProvider: (provider: ProviderId) => void;
  setTheme: (theme: Settings['theme']) => void;
  setLanguage: (lang: Settings['language']) => void;
  setAutoSave: (val: boolean) => void;
  setNotifications: (val: boolean) => void;
  setVoiceEnabled: (val: boolean) => void;
  setVoiceLanguage: (lang: 'fr-FR' | 'en-US') => void;
  setADHDMode: (val: boolean) => void;
  setSkillAutoGenerate: (val: boolean) => void;
  setOrchestratorEnabled: (val: boolean) => void;
  addVPSConfig: (config: VPSConfig) => void;
  updateVPSConfig: (id: string, config: Partial<VPSConfig>) => void;
  removeVPSConfig: (id: string) => void;
  reset: () => void;
  getApiKey: (provider: ProviderId) => string;
  getEnabledProviders: () => ProviderId[];
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,
      vpsConfigs: [],

      setApiKey: (provider, key) =>
        set(state => ({
          apiKeys: state.apiKeys.map(k =>
            k.provider === provider ? { ...k, key } : k
          ),
        })),

      toggleProvider: (provider, enabled) =>
        set(state => ({
          apiKeys: state.apiKeys.map(k =>
            k.provider === provider ? { ...k, enabled } : k
          ),
        })),

      setDefaultModel: (model) => set({ defaultModel: model }),
      setDefaultProvider: (provider) => set({ defaultProvider: provider }),
      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setAutoSave: (autoSave) => set({ autoSave }),
      setNotifications: (notifications) => set({ notifications }),
      setVoiceEnabled: (voiceEnabled) => set({ voiceEnabled }),
      setVoiceLanguage: (voiceLanguage) => set({ voiceLanguage }),
      setADHDMode: (adhdMode) => set({ adhdMode }),
      setSkillAutoGenerate: (skillAutoGenerate) => set({ skillAutoGenerate }),
      setOrchestratorEnabled: (orchestratorEnabled) => set({ orchestratorEnabled }),

      addVPSConfig: (config) =>
        set(state => ({ vpsConfigs: [...state.vpsConfigs, config] })),

      updateVPSConfig: (id, config) =>
        set(state => ({
          vpsConfigs: state.vpsConfigs.map(c =>
            c.id === id ? { ...c, ...config } : c
          ),
        })),

      removeVPSConfig: (id) =>
        set(state => ({ vpsConfigs: state.vpsConfigs.filter(c => c.id !== id) })),

      reset: () => set({ ...defaultSettings, vpsConfigs: [] }),

      getApiKey: (provider) => get().apiKeys.find(k => k.provider === provider)?.key || '',

      getEnabledProviders: () => get().apiKeys.filter(k => k.enabled && k.key).map(k => k.provider),
    }),
    {
      name: 'seb-atlantis-settings-v4',
      storage: createJSONStorage(() => localStorage),
      version: 4,
    }
  )
);
