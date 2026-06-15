import { useState, useMemo } from "react";
import { useSettingsStore } from "../stores/settingsStore";
import type { ProviderId } from "../types";

const PROVIDER_MODELS: Record<ProviderId, Array<{ id: string; name: string; context: string; free?: boolean }>> = {
  openrouter: [
    { id: "google/gemma-3-27b-it:free", name: "Gemma 3 27B", context: "128k", free: true },
    { id: "qwen/qwen-2.5-coder-32b-instruct:free", name: "Qwen 2.5 Coder 32B", context: "32k", free: true },
    { id: "meta-llama/llama-3.1-8b-instruct:free", name: "Llama 3.1 8B", context: "128k", free: true },
    { id: "mistral/mistral-nemo:free", name: "Mistral Nemo 12B", context: "128k", free: true },
    { id: "nousresearch/hermes-3-llama-3.1-8b:free", name: "Hermes 3 Llama 3.1 8B", context: "128k", free: true },
    { id: "google/gemma-2-9b-it:free", name: "Gemma 2 9B", context: "8k", free: true },
    { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", context: "200k" },
    { id: "openai/gpt-4o", name: "GPT-4o", context: "128k" },
    { id: "google/gemini-pro-1.5", name: "Gemini 1.5 Pro", context: "1M" },
  ],
  huggingface: [
    { id: "hf-meta-llama/Meta-Llama-3.1-70B-Instruct", name: "Llama 3.1 70B", context: "8k" },
    { id: "hf-mistralai/Mistral-7B-Instruct-v0.3", name: "Mistral 7B Instruct", context: "8k" },
    { id: "hf-Qwen/Qwen2.5-Coder-32B-Instruct", name: "Qwen 2.5 Coder 32B", context: "32k" },
    { id: "hf-microsoft/Phi-3.5-mini-instruct", name: "Phi 3.5 Mini", context: "4k" },
  ],
  google: [
    { id: "gemini-1.5-pro", name: "Gemini 1.5 Pro", context: "1M" },
    { id: "gemini-1.5-flash", name: "Gemini 1.5 Flash", context: "1M" },
    { id: "gemini-1.5-flash-8b", name: "Gemini 1.5 Flash 8B", context: "1M" },
  ],
  anthropic: [
    { id: "claude-3-5-sonnet-20241022", name: "Claude 3.5 Sonnet", context: "200k" },
    { id: "claude-3-5-haiku-20241022", name: "Claude 3.5 Haiku", context: "200k" },
    { id: "claude-3-opus-20240229", name: "Claude 3 Opus", context: "200k" },
  ],
  openai: [
    { id: "gpt-4o", name: "GPT-4o", context: "128k" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", context: "128k" },
    { id: "o1-preview", name: "o1 Preview", context: "128k" },
    { id: "o1-mini", name: "o1 Mini", context: "128k" },
  ],
  together: [
    { id: "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo", name: "Llama 3.1 70B Turbo", context: "8k" },
    { id: "mistralai/Mixtral-8x7B-Instruct-v0.1", name: "Mixtral 8x7B", context: "8k" },
    { id: "Qwen/Qwen2.5-72B-Instruct", name: "Qwen 2.5 72B", context: "8k" },
    { id: "deepseek-ai/DeepSeek-V2.5", name: "DeepSeek V2.5", context: "8k" },
  ],
  groq: [
    { id: "llama-3.1-70b-versatile", name: "Llama 3.1 70B", context: "8k" },
    { id: "llama-3.1-8b-instant", name: "Llama 3.1 8B Instant", context: "8k" },
    { id: "mixtral-8x7b-32768", name: "Mixtral 8x7B", context: "32k" },
    { id: "gemma2-9b-it", name: "Gemma 2 9B", context: "8k" },
  ],
  cohere: [
    { id: "command-r-plus", name: "Command R+", context: "128k" },
    { id: "command-r", name: "Command R", context: "128k" },
  ],
  mistral: [
    { id: "mistral-large-latest", name: "Mistral Large", context: "32k" },
    { id: "mistral-small-latest", name: "Mistral Small", context: "32k" },
    { id: "codestral-latest", name: "Codestral", context: "32k" },
  ],
  perplexity: [
    { id: "llama-3.1-sonar-large-128k-online", name: "Sonar Large Online", context: "128k" },
    { id: "llama-3.1-sonar-small-128k-online", name: "Sonar Small Online", context: "128k" },
  ],
  xai: [
    { id: "grok-beta", name: "Grok Beta", context: "128k" }
  ],
  ollama: [
    { id: "llama3", name: "Llama 3", context: "8k" },
    { id: "mistral", name: "Mistral 7B", context: "32k" },
    { id: "codellama", name: "CodeLlama", context: "16k" },
    { id: "phi3", name: "Phi 3", context: "4k" },
  ],
};

const PROVIDER_LABELS: Record<ProviderId, string> = {
  openrouter: "OpenRouter",
  huggingface: "HuggingFace",
  google: "Google AI",
  anthropic: "Anthropic",
  openai: "OpenAI",
  together: "Together AI",
  groq: "Groq",
  cohere: "Cohere",
  mistral: "Mistral AI",
  perplexity: "Perplexity",
  xai: "xAI",
  ollama: "Ollama (Local)",
};

interface ModelSelectorProps {
  currentModel: string;
  onChange: (model: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ currentModel, onChange, disabled }: ModelSelectorProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const { apiKeys, defaultProvider } = useSettingsStore();

  const enabledProviders = useMemo(() => 
    Object.entries(apiKeys)
      .filter(([, v]) => v.enabled && v.key)
      .map(([k]) => k as ProviderId),
    [apiKeys]
  );

  const allModels = useMemo(() => {
    const models: Array<{ id: string; name: string; context: string; provider: ProviderId; free?: boolean }> = [];
    enabledProviders.forEach(p => {
      PROVIDER_MODELS[p]?.forEach(m => models.push({ ...m, provider: p }));
    });
    return models;
  }, [enabledProviders]);

  const current = allModels.find(m => m.id === currentModel) || allModels[0] || { id: currentModel, name: currentModel, context: "?", provider: defaultProvider };

  const handleSelect = (modelId: string) => {
    if (disabled) return;
    onChange(modelId);
    setShowDropdown(false);
  };

  const toggleDropdown = () => {
    if (!disabled) setShowDropdown(prev => !prev);
  };

  const groupByProvider = useMemo(() => {
    const groups: Record<ProviderId, typeof allModels> = {} as any;
    allModels.forEach(m => {
      if (!groups[m.provider]) groups[m.provider] = [];
      groups[m.provider].push(m);
    });
    return groups;
  }, [allModels]);

  if (allModels.length === 0) {
    return (
      <div className="model-selector">
        <button className="model-selector-trigger" disabled>
          <span className="model-name">Aucun provider activé</span>
          <span className="model-context">⚙️ Réglages</span>
        </button>
      </div>
    );
  }

  return (
    <div className="model-selector">
      <button
        className="model-selector-trigger"
        onClick={toggleDropdown}
        aria-haspopup="listbox"
        aria-expanded={showDropdown}
        disabled={disabled}
      >
        <span className="model-name">{current.name}</span>
        <span className="model-context">{current.context}</span>
        <svg className="chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {showDropdown && (
        <div className="model-dropdown" role="listbox">
          {(Object.keys(groupByProvider) as ProviderId[]).map(provider => (
            <div key={provider} className="model-group">
              <div className="model-group-label">{PROVIDER_LABELS[provider]}</div>
              {groupByProvider[provider].map((model) => (
                <button
                  key={model.id}
                  className="model-option"
                  onClick={() => handleSelect(model.id)}
                  role="option"
                  aria-selected={model.id === currentModel}
                  disabled={disabled}
                >
                  <span className="model-option-name">{model.name} {model.free && "🆓"}</span>
                  <span className="model-option-context">{model.context}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
