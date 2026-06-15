import { useState, useMemo } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import { useToast, Modal } from "../components/ui";
import type { VPSConfig, ProviderId, ApiKeyConfig } from "../types";

const PROVIDER_INFO: Record<ProviderId, { name: string; url: string; keyPrefix: string; description: string }> = {
  openrouter: { name: "OpenRouter", url: "https://openrouter.ai/keys", keyPrefix: "sk-or-", description: "100+ modèles (Gratuits + Payants)" },
  huggingface: { name: "HuggingFace", url: "https://huggingface.co/settings/tokens", keyPrefix: "hf_", description: "Modèles open-source, Inference API" },
  google: { name: "Google AI (Gemini)", url: "https://aistudio.google.com/apikey", keyPrefix: "AIza", description: "Gemini 1.5 Pro/Flash, 1M context" },
  anthropic: { name: "Anthropic", url: "https://console.anthropic.com/settings/keys", keyPrefix: "sk-ant-", description: "Claude 3.5 Sonnet, Opus, Haiku" },
  openai: { name: "OpenAI", url: "https://platform.openai.com/api-keys", keyPrefix: "sk-", description: "GPT-4o, GPT-4o-mini, o1, o3" },
  together: { name: "Together AI", url: "https://api.together.xyz/settings/api-keys", keyPrefix: "", description: "Llama, Mixtral, Qwen, DeepSeek" },
  groq: { name: "Groq", url: "https://console.groq.com/keys", keyPrefix: "gsk_", description: "Inférence ultra-rapide (Llama, Mixtral)" },
  cohere: { name: "Cohere", url: "https://dashboard.cohere.com/api-keys", keyPrefix: "", description: "Command R/R+, Embed, Rerank" },
  mistral: { name: "Mistral AI", url: "https://console.mistral.ai/api-keys", keyPrefix: "", description: "Mistral Large, Small, Codestral" },
  perplexity: { name: "Perplexity", url: "https://www.perplexity.ai/settings/api", keyPrefix: "pplx-", description: "Sonar (recherche web + LLM)" },
  xai: { name: "xAI", url: "https://console.x.ai/", keyPrefix: "", description: "Grok models" },
  ollama: { name: "Ollama (Local)", url: "http://localhost:11434", keyPrefix: "", description: "Modèles locaux via Ollama" },
};

const PROVIDERS_LIST: ProviderId[] = [
  'openrouter', 'huggingface', 'google', 'anthropic', 'openai',
  'together', 'groq', 'cohere', 'mistral', 'perplexity', 'xai', 'ollama'
];

export default function SettingsPage() {
  const settings = useSettingsStore();
  const { addToast } = useToast();

  const [showAddVPS, setShowAddVPS] = useState(false);
  const [newVPS, setNewVPS] = useState<Partial<VPSConfig>>({
    name: "", host: "", port: 22, username: "root", authType: "key",
  });
  const [showApiKeys, setShowApiKeys] = useState<Record<string, boolean>>({});

  const handleTestApiKey = async (provider: ProviderId) => {
    const key = settings.getApiKey(provider);
    if (!key) {
      addToast({ type: "error", message: `Entrez d'abord une clé ${PROVIDER_INFO[provider].name}` });
      return;
    }

    const testEndpoints: Record<string, string> = {
      openrouter: "https://openrouter.ai/api/v1/models",
      huggingface: "https://huggingface.co/api/whoami-v2",
      google: "https://generativelanguage.googleapis.com/v1beta/models?key=" + key,
      anthropic: "https://api.anthropic.com/v1/messages",
      openai: "https://api.openai.com/v1/models",
      together: "https://api.together.xyz/v1/models",
      groq: "https://api.groq.com/openai/v1/models",
      cohere: "https://api.cohere.com/v1/models",
      mistral: "https://api.mistral.ai/v1/models",
      perplexity: "https://api.perplexity.ai/models",
      xai: "https://api.x.ai/v1/models",
      ollama: "http://localhost:11434/api/tags",
    };

    const authHeaders: Record<string, Record<string, string>> = {
      openrouter: { Authorization: `Bearer ${key}` },
      huggingface: { Authorization: `Bearer ${key}` },
      google: {},
      anthropic: { "x-api-key": key, "anthropic-version": "2023-06-01" },
      openai: { Authorization: `Bearer ${key}` },
      together: { Authorization: `Bearer ${key}` },
      groq: { Authorization: `Bearer ${key}` },
      cohere: { Authorization: `Bearer ${key}` },
      mistral: { Authorization: `Bearer ${key}` },
      perplexity: { Authorization: `Bearer ${key}` },
      xai: { Authorization: `Bearer ${key}` },
      ollama: {},
    };

    try {
      const res = await fetch(testEndpoints[provider], {
        headers: authHeaders[provider],
        method: provider === 'anthropic' ? 'POST' : 'GET',
        body: provider === 'anthropic' ? JSON.stringify({ model: "claude-3-haiku-20240307", max_tokens: 1, messages: [{ role: "user", content: "test" }] }) : undefined,
      });

      if (res.ok) {
        addToast({ type: "success", message: `✅ Clé ${PROVIDER_INFO[provider].name} valide` });
      } else {
        const err = await res.text();
        addToast({ type: "error", message: `❌ Clé invalide (${res.status}): ${err.slice(0, 100)}` });
      }
    } catch (err: any) {
      addToast({ type: "error", message: `Erreur: ${err.message}` });
    }
  };

  const handleAddVPS = () => {
    if (!newVPS.name || !newVPS.host || !newVPS.username) {
      addToast({ type: "error", message: "Nom, hôte et utilisateur requis" });
      return;
    }
    settings.addVPSConfig({
      id: crypto.randomUUID(),
      name: newVPS.name || "",
      host: newVPS.host || "",
      port: newVPS.port || 22,
      username: newVPS.username || "root",
      authType: (newVPS.authType as "password" | "key") || "key",
      password: newVPS.password,
      keyPath: newVPS.keyPath,
    });
    setShowAddVPS(false);
    setNewVPS({ name: "", host: "", port: 22, username: "root", authType: "key" });
    addToast({ type: "success", message: `VPS "${newVPS.name}" ajouté` });
  };

  const handleExportData = () => {
    const data = {
      settings: {
        apiKeys: settings.apiKeys,
        defaultModel: settings.defaultModel,
        defaultProvider: settings.defaultProvider,
        theme: settings.theme,
        language: settings.language,
        vpsConfigs: settings.vpsConfigs,
        voiceEnabled: settings.voiceEnabled,
        adhdMode: settings.adhdMode,
        skillAutoGenerate: settings.skillAutoGenerate,
        orchestratorEnabled: settings.orchestratorEnabled,
      },
      rooms: localStorage.getItem("seb-atlantis-rooms-v4"),
      memory: localStorage.getItem("seb-atlantis-memory-v4"),
      skills: localStorage.getItem("seb-atlantis-skills-v4"),
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `seb-atlantis-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: "success", message: "Données exportées" });
  };

  const handleImportData = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target?.result as string);
          if (data.settings) {
            if (data.settings.apiKeys) data.settings.apiKeys.forEach((k: ApiKeyConfig) => {
              if (k.key) settings.setApiKey(k.provider, k.key);
              if (k.enabled) settings.toggleProvider(k.provider, true);
            });
            if (data.settings.defaultModel) settings.setDefaultModel(data.settings.defaultModel);
            if (data.settings.defaultProvider) settings.setDefaultProvider(data.settings.defaultProvider);
            if (data.settings.theme) settings.setTheme(data.settings.theme);
            if (data.settings.voiceEnabled !== undefined) settings.setVoiceEnabled(data.settings.voiceEnabled);
            if (data.settings.adhdMode !== undefined) settings.setADHDMode(data.settings.adhdMode);
            if (data.settings.skillAutoGenerate !== undefined) settings.setSkillAutoGenerate(data.settings.skillAutoGenerate);
            if (data.settings.orchestratorEnabled !== undefined) settings.setOrchestratorEnabled(data.settings.orchestratorEnabled);
          }
          if (data.rooms) localStorage.setItem("seb-atlantis-rooms-v4", data.rooms);
          if (data.memory) localStorage.setItem("seb-atlantis-memory-v4", data.memory);
          if (data.skills) localStorage.setItem("seb-atlantis-skills-v4", data.skills);
          addToast({ type: "success", message: "Données importées — rechargez la page" });
        } catch {
          addToast({ type: "error", message: "Fichier invalide" });
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const enabledProviders = useMemo(() => settings.getEnabledProviders(), [settings.apiKeys]);

  return (
    <div className="page">
      <div className="page-header">
        <h2>⚙️ Réglages</h2>
        <div className="page-actions">
          <button className="btn btn-secondary btn-sm" onClick={handleExportData}>📤 Exporter</button>
          <button className="btn btn-secondary btn-sm" onClick={handleImportData}>📥 Importer</button>
        </div>
      </div>

      <div className="settings-sections">
        {/* API Keys Section */}
        <section className="settings-section">
          <h3>🔑 Clés API — {enabledProviders.length} activé(s)</h3>
          <p className="text-muted">Configurez vos fournisseurs. Cochez "Activé" après avoir entré la clé.</p>

          <div className="providers-grid">
            {PROVIDERS_LIST.map((provider) => {
              const info = PROVIDER_INFO[provider];
              const keyConfig = settings.apiKeys.find(k => k.provider === provider)!;
              return (
                <div key={provider} className="provider-card">
                  <div className="provider-header">
                    <strong>{info.name}</strong>
                    <label className="toggle-switch">
                      <input
                        type="checkbox"
                        checked={keyConfig.enabled && !!keyConfig.key}
                        onChange={(e) => settings.toggleProvider(provider, e.target.checked)}
                        disabled={!keyConfig.key}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="provider-desc">{info.description}</p>
                  <div className="form-group">
                    <label>Clé API</label>
                    <div className="input-with-toggle">
                      <input
                        type={showApiKeys[provider] ? "text" : "password"}
                        placeholder={info.keyPrefix + "..."}
                        value={keyConfig.key}
                        onChange={(e) => settings.setApiKey(provider, e.target.value)}
                      />
                      <button
                        className="btn btn-sm btn-secondary"
                        onClick={() => setShowApiKeys(prev => ({ ...prev, [provider]: !prev[provider] }))}
                      >
                        {showApiKeys[provider] ? "🙈" : "👁️"}
                      </button>
                    </div>
                  </div>
                  <div className="provider-actions">
                    <a href={info.url} target="_blank" rel="noopener noreferrer" className="btn btn-xs btn-secondary">
                      Obtenir une clé
                    </a>
                    <button
                      className="btn btn-xs btn-primary"
                      onClick={() => handleTestApiKey(provider)}
                      disabled={!keyConfig.key}
                    >
                      Tester
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Default Model */}
          <div className="form-group" style={{ marginTop: "1rem" }}>
            <label>Fournisseur par défaut</label>
            <select
              value={settings.defaultProvider}
              onChange={(e) => settings.setDefaultProvider(e.target.value as ProviderId)}
            >
              {PROVIDERS_LIST.map(p => (
                <option key={p} value={p} disabled={!settings.apiKeys.find(k => k.provider === p)?.enabled}>
                  {PROVIDER_INFO[p].name} {!settings.apiKeys.find(k => k.provider === p)?.enabled && "(inactif)"}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label>Modèle par défaut</label>
            <select value={settings.defaultModel} onChange={(e) => settings.setDefaultModel(e.target.value)}>
              <option value="google/gemma-3-27b-it:free">Gemma 3 27B (Free - OpenRouter)</option>
              <option value="deepseek/deepseek-chat-v3-0324:free">DeepSeek V3 (Free - OpenRouter)</option>
              <option value="meta-llama/llama-3.1-8b-instruct:free">Llama 3.1 8B (Free - OpenRouter)</option>
              <option value="gpt-4o-mini">GPT-4o Mini (OpenAI)</option>
              <option value="claude-3-haiku-20240307">Claude 3 Haiku (Anthropic)</option>
              <option value="gemini-1.5-flash">Gemini 1.5 Flash (Google)</option>
              <option value="llama-3.1-70b-versatile">Llama 3.1 70B (Groq)</option>
              <option value="mistral-large-latest">Mistral Large (Mistral)</option>
            </select>
          </div>
        </section>

        {/* Agent Settings */}
        <section className="settings-section">
          <h3>🤖 Agents & Orchestration</h3>
          <p className="text-muted">Configurez le comportement des agents et de l'orchestrateur.</p>

          <div className="form-group">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.orchestratorEnabled}
                onChange={(e) => settings.setOrchestratorEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span style={{ marginLeft: "0.75rem" }}>Orchestrateur — Route automatiquement vers le bon agent</span>
            </label>
          </div>
          <div className="form-group">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.skillAutoGenerate}
                onChange={(e) => settings.setSkillAutoGenerate(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span style={{ marginLeft: "0.75rem" }}>Auto-génération de skills — Crée des skills après les tâches complexes</span>
            </label>
          </div>
        </section>

        {/* Voice Settings */}
        <section className="settings-section">
          <h3>🎙️ Reconnaissance Vocale</h3>
          <p className="text-muted">Speech-to-Text et Text-to-Speech pour le mode mains-libres.</p>

          <div className="form-group">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.voiceEnabled}
                onChange={(e) => settings.setVoiceEnabled(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span style={{ marginLeft: "0.75rem" }}>Activer la reconnaissance vocale</span>
            </label>
          </div>
          <div className="form-group">
            <label>Langue vocale</label>
            <div className="theme-selector">
              {(["fr-FR", "en-US"] as const).map((l) => (
                <button
                  key={l}
                  className={`btn ${settings.voiceLanguage === l ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => settings.setVoiceLanguage(l)}
                >
                  {l === "fr-FR" ? "🇫🇷 Français" : "🇺🇸 English"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ADHD Settings */}
        <section className="settings-section">
          <h3>🎯 Mode ADHD</h3>
          <p className="text-muted">Configuration du salon Mode Focus adapté au ADHD.</p>

          <div className="form-group">
            <label className="toggle-switch">
              <input
                type="checkbox"
                checked={settings.adhdMode}
                onChange={(e) => settings.setADHDMode(e.target.checked)}
              />
              <span className="toggle-slider"></span>
              <span style={{ marginLeft: "0.75rem" }}>Activer le mode ADHD par défaut</span>
            </label>
          </div>
        </section>

        {/* Appearance */}
        <section className="settings-section">
          <h3>🎨 Apparence</h3>
          <div className="form-group">
            <label>Thème</label>
            <div className="theme-selector">
              {(["dark", "light", "system"] as const).map((t) => (
                <button
                  key={t}
                  className={`btn ${settings.theme === t ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => settings.setTheme(t)}
                >
                  {t === "dark" ? "🌙 Sombre" : t === "light" ? "☀️ Clair" : "💻 Système"}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label>Langue</label>
            <div className="theme-selector">
              {(["fr", "en"] as const).map((l) => (
                <button
                  key={l}
                  className={`btn ${settings.language === l ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => settings.setLanguage(l)}
                >
                  {l === "fr" ? "🇫🇷 Français" : "🇺🇸 English"}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* VPS Configs */}
        <section className="settings-section">
          <h3>🖥️ Serveurs VPS</h3>
          {settings.vpsConfigs.length === 0 && (
            <p className="text-muted">Aucun VPS configuré</p>
          )}
          {settings.vpsConfigs.map((vps) => (
            <div key={vps.id} className="vps-config-item">
              <div>
                <strong>{vps.name}</strong>
                <span className="text-muted"> — {vps.username}@{vps.host}:{vps.port}</span>
              </div>
              <button className="btn btn-xs btn-danger" onClick={() => settings.removeVPSConfig(vps.id)}>Supprimer</button>
            </div>
          ))}
          <button className="btn btn-secondary btn-sm" onClick={() => setShowAddVPS(true)}>+ Ajouter un VPS</button>
        </section>

        {/* About */}
        <section className="settings-section">
          <h3>ℹ️ À propos</h3>
          <div className="about-info">
            <p><strong>seb_Atlantis v4.0</strong></p>
            <p>Multi-Agents • Salons spécialisés • Skills auto-générés • Mémoire FTS5 • Vocal • ADHD</p>
            <p>React 19 + Vite 7 + Zustand + Tauri v2 + Rust</p>
            <p className="text-muted">Par Seb Dardeau © 2026</p>
          </div>
        </section>
      </div>

      {/* Add VPS Modal */}
      <Modal isOpen={showAddVPS} onClose={() => setShowAddVPS(false)} title="Ajouter un VPS">
        <div className="form-group">
          <label>Nom</label>
          <input type="text" placeholder="ex: VPS OVH" value={newVPS.name} onChange={(e) => setNewVPS({ ...newVPS, name: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Hôte</label>
          <input type="text" placeholder="IP ou domaine" value={newVPS.host} onChange={(e) => setNewVPS({ ...newVPS, host: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Port</label>
          <input type="number" value={newVPS.port} onChange={(e) => setNewVPS({ ...newVPS, port: parseInt(e.target.value) || 22 })} />
        </div>
        <div className="form-group">
          <label>Utilisateur</label>
          <input type="text" value={newVPS.username} onChange={(e) => setNewVPS({ ...newVPS, username: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Auth</label>
          <select value={newVPS.authType} onChange={(e) => setNewVPS({ ...newVPS, authType: e.target.value as "password" | "key" })}>
            <option value="key">Clé SSH</option>
            <option value="password">Mot de passe</option>
          </select>
        </div>
        {newVPS.authType === "password" && (
          <div className="form-group">
            <label>Mot de passe</label>
            <input type="password" value={newVPS.password || ""} onChange={(e) => setNewVPS({ ...newVPS, password: e.target.value })} />
          </div>
        )}
        {newVPS.authType === "key" && (
          <div className="form-group">
            <label>Chemin clé SSH</label>
            <input type="text" placeholder="~/.ssh/id_rsa" value={newVPS.keyPath || ""} onChange={(e) => setNewVPS({ ...newVPS, keyPath: e.target.value })} />
          </div>
        )}
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowAddVPS(false)}>Annuler</button>
          <button className="btn btn-primary" onClick={handleAddVPS}>Ajouter</button>
        </div>
      </Modal>
    </div>
  );
}
