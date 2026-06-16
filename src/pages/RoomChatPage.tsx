import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useRoomStore } from '../stores/roomStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useVoiceStore } from '../stores/voiceStore';
import { usePomodoroStore } from '../stores/voiceStore';
import { useSkillStore } from '../stores/skillStore';
import { useMemoryStore } from '../stores/memoryStore';
import { useToast } from '../components/ui';
import { ModelSelector } from '../components/ModelSelector';
import { AGENTS, type AgentId, type ProviderId } from '../types';

// ============ PROVIDER CONFIG ============
const PROVIDER_CONFIG: Record<ProviderId, { baseUrl: string; authHeader: (key: string) => Record<string, string> }> = {
  openrouter: { baseUrl: 'https://openrouter.ai/api/v1/chat/completions', authHeader: (key) => ({ Authorization: `Bearer ${key}`, 'HTTP-Referer': 'https://seb-atlantis.local', 'X-Title': 'seb_Atlantis' }) },
  huggingface: { baseUrl: 'https://api-inference.huggingface.co/models/', authHeader: (key) => ({ Authorization: `Bearer ${key}` }) },
  google: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models/', authHeader: () => ({}) },
  anthropic: { baseUrl: 'https://api.anthropic.com/v1/messages', authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }) },
  openai: { baseUrl: 'https://api.openai.com/v1/chat/completions', authHeader: (key) => ({ Authorization: `Bearer ${key}` }) },
  together: { baseUrl: 'https://api.together.xyz/v1/chat/completions', authHeader: (key) => ({ Authorization: `Bearer ${key}` }) },
  groq: { baseUrl: 'https://api.groq.com/openai/v1/chat/completions', authHeader: (key) => ({ Authorization: `Bearer ${key}` }) },
  cohere: { baseUrl: 'https://api.cohere.com/v1/chat', authHeader: (key) => ({ Authorization: `Bearer ${key}` }) },
  mistral: { baseUrl: 'https://api.mistral.ai/v1/chat/completions', authHeader: (key) => ({ Authorization: `Bearer ${key}` }) },
  perplexity: { baseUrl: 'https://api.perplexity.ai/chat/completions', authHeader: (key) => ({ Authorization: `Bearer ${key}` }) },
  xai: { baseUrl: 'https://api.x.ai/v1/chat/completions', authHeader: (key) => ({ Authorization: `Bearer ${key}` }) },
  ollama: { baseUrl: 'http://localhost:11434/api/chat', authHeader: () => ({}) },
};

function getProviderFromModel(modelId: string): ProviderId {
  if (modelId.startsWith('gpt-') || modelId.startsWith('o1') || modelId.startsWith('o3')) return 'openai';
  if (modelId.startsWith('claude-')) return 'anthropic';
  if (modelId.startsWith('gemini-')) return 'google';
  if (modelId.startsWith('hf-') || modelId.includes('huggingface')) return 'huggingface';
  if (modelId.startsWith('groq/') || modelId.includes('llama-3') || modelId.includes('mixtral') || modelId.includes('gemma2')) return 'groq';
  if (modelId.startsWith('together/') || modelId.startsWith('meta-llama/') || modelId.startsWith('mistralai/') || modelId.startsWith('Qwen/') || modelId.startsWith('deepseek-ai/')) return 'together';
  if (modelId.startsWith('perplexity/') || modelId.includes('sonar')) return 'perplexity';
  if (modelId.startsWith('xai/') || modelId.includes('grok')) return 'xai';
  if (modelId.startsWith('cohere/') || modelId.includes('command')) return 'cohere';
  if (modelId.startsWith('mistral/')) return 'mistral';
  if (modelId.startsWith('ollama/') || modelId.includes(':')) return 'ollama';
  return 'openrouter';
}

function buildUrl(provider: ProviderId, model: string, apiKey: string): string {
  const config = PROVIDER_CONFIG[provider];
  if (provider === 'google') return `${config.baseUrl}${model}:streamGenerateContent?key=${apiKey}&alt=sse`;
  if (provider === 'huggingface') return `${config.baseUrl}${model}`;
  if (provider === 'ollama') return config.baseUrl;
  return config.baseUrl;
}

function buildBody(provider: ProviderId, model: string, messages: Array<{ role: string; content: string }>, systemPrompt?: string, stream: boolean = true) {
  const msgs = systemPrompt
    ? [{ role: 'system', content: systemPrompt }, ...messages]
    : messages;

  switch (provider) {
    case 'anthropic':
      return { model, max_tokens: 4096, system: systemPrompt, messages: msgs.filter(m => m.role !== 'system'), stream };
    case 'google':
      return { contents: msgs.map(m => ({ role: m.role === 'assistant' ? 'model' : m.role, parts: [{ text: m.content }] })), generationConfig: { maxOutputTokens: 4096 } };
    case 'cohere':
      return { model, message: msgs[msgs.length - 1]?.content || '', chat_history: msgs.slice(0, -1).map(m => ({ role: m.role === 'assistant' ? 'CHATBOT' : 'USER', message: m.content })), stream };
    case 'ollama':
      return { model, messages: msgs, stream };
    default:
      return { model, messages: msgs, stream, max_tokens: 4096 };
  }
}

async function parseStream(provider: ProviderId, reader: ReadableStreamDefaultReader<Uint8Array>, decoder: TextDecoder, onChunk: (text: string) => void) {
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        let delta = '';
        if (provider === 'google') {
          if (trimmed.startsWith('data: ')) {
            const data = JSON.parse(trimmed.slice(6));
            delta = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
          }
        } else if (provider === 'anthropic') {
          if (trimmed.startsWith('data: ')) {
            const data = JSON.parse(trimmed.slice(6));
            if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') delta = data.delta.text;
          }
        } else if (provider === 'ollama') {
          const data = JSON.parse(trimmed);
          delta = data.message?.content || data.response || '';
          if (data.done) return;
        } else {
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') return;
            const parsed = JSON.parse(data);
            delta = parsed.choices?.[0]?.delta?.content || '';
          }
        }
        if (delta) onChunk(delta);
      } catch { /* skip malformed */ }
    }
  }
}

// ============ ORCHESTRATOR ============
function orchestrateMessage(text: string): AgentId {
  const lower = text.toLowerCase();
  for (const [, agent] of Object.entries(AGENTS)) {
    if (agent.id === 'orchestrator') continue;
    for (const keyword of agent.keywords) {
      if (lower.includes(keyword)) return agent.id;
    }
  }
  return 'orchestrator';
}

// ============ MAIN COMPONENT ============
export default function RoomChat() {
  const roomStore = useRoomStore();
  const { activeRoomId, rooms, isStreaming, setActiveRoom, addMessage, updateMessage, setStreaming, setAbortController, abortStream, getActiveRoom, getActiveMessages } = roomStore;
  const settings = useSettingsStore();
  const voiceStore = useVoiceStore();
  const pomodoro = usePomodoroStore();
  const skillStore = useSkillStore();
  const memoryStore = useMemoryStore();
  const { addToast } = useToast();

  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(settings.defaultModel);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const recognitionRef = useRef<any>(null);

  const activeRoom = getActiveRoom();
  const roomMessages = getActiveMessages();
  const currentAgent = useMemo(() => {
    if (!activeRoom?.agentIds[0]) return AGENTS.orchestrator;
    return AGENTS[activeRoom.agentIds[0] as AgentId] || AGENTS.orchestrator;
  }, [activeRoom]);

  // Scroll to bottom
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [roomMessages]);
  useEffect(() => { voiceStore.clearTranscript(); }, [activeRoomId]);

  // Pomodoro timer
  useEffect(() => {
    if (!pomodoro.isRunning) return;
    const interval = setInterval(() => { pomodoro.tick(); }, 1000);
    return () => clearInterval(interval);
  }, [pomodoro.isRunning, pomodoro]);

  // Voice recognition
  const startListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      addToast({ type: 'error', message: 'Reconnaissance vocale non supportée' });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = voiceStore.language;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      voiceStore.setInterimTranscript(interim);
      if (final) voiceStore.appendTranscript(final);
    };

    recognition.onend = () => {
      voiceStore.setListening(false);
      voiceStore.setInterimTranscript('');
    };

    recognition.onerror = () => voiceStore.setListening(false);
    recognitionRef.current = recognition;
    recognition.start();
    voiceStore.setListening(true);
  }, [voiceStore, addToast]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    voiceStore.setListening(false);
  }, [voiceStore]);

  // TTS
  const speakText = useCallback((text: string) => {
    if (!voiceStore.voiceEnabled) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = voiceStore.language;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    voiceStore.setSpeaking(true);
    utterance.onend = () => voiceStore.setSpeaking(false);
    speechSynthesis.speak(utterance);
  }, [voiceStore]);

  // Send message
  const sendMessage = async () => {
    const text = input.trim() || voiceStore.transcript.trim();
    if (!text || isStreaming) return;

    const provider = getProviderFromModel(selectedModel);
    const apiKey = settings.getApiKey(provider);
    if (!apiKey) {
      addToast({ type: 'error', message: `Clé API ${provider} manquante — Réglages` });
      return;
    }

    // Determine which agent to use
    let agentToUse = currentAgent;
    if (settings.orchestratorEnabled && activeRoom?.type === 'general') {
      const routedAgentId = orchestrateMessage(text);
      agentToUse = AGENTS[routedAgentId];
    }

    const userMsg = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content: text,
      timestamp: Date.now(),
      roomId: activeRoomId,
    };
    addMessage(activeRoomId, userMsg);
    setInput('');
    voiceStore.clearTranscript();

    // Auto-save to memory
    if (settings.autoSave) {
      memoryStore.autoSaveFromMessage(text, activeRoomId, agentToUse.id);
    }

    const assistantId = crypto.randomUUID();
    const assistantMsg = {
      id: assistantId,
      role: 'assistant' as const,
      content: '',
      timestamp: Date.now(),
      streaming: true,
      model: selectedModel,
      agentId: agentToUse.id,
      roomId: activeRoomId,
    };
    addMessage(activeRoomId, assistantMsg);

    const controller = new AbortController();
    setAbortController(controller);
    setStreaming(true);

    try {
      // Build context: system prompt + memory + conversation history
      const roomMsgs = useRoomStore.getState().messages[activeRoomId] || [];
      const historyMsgs = roomMsgs.filter((m: any) => !m.streaming).slice(-20).map((m: any) => ({ role: m.role, content: m.content }));

      // Add memory context if relevant
      const memoryResults = memoryStore.search(text);
      let memoryContext = '';
      if (memoryResults.length > 0) {
        memoryContext = '\n\n--- Mémoire pertinente ---\n' + memoryResults.slice(0, 3).map(r => `[${r.entry.key}]: ${r.entry.value}`).join('\n');
      }

      const systemPrompt = (agentToUse.systemPrompt + memoryContext) || undefined;
      const config = PROVIDER_CONFIG[provider];
      const url = buildUrl(provider, selectedModel, apiKey);
      const body = buildBody(provider, selectedModel, historyMsgs, systemPrompt, true);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...config.authHeader(apiKey) },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`API Error ${response.status}: ${errText.slice(0, 200)}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Pas de réponse stream');

      const decoder = new TextDecoder();
      let fullContent = '';

      await parseStream(provider, reader, decoder, (delta) => {
        fullContent += delta;
        updateMessage(activeRoomId, assistantId, fullContent);
      });

      // Finalize
      updateMessage(activeRoomId, assistantId, fullContent);

      // TTS
      if (voiceStore.voiceEnabled) {
        const shortReply = fullContent.slice(0, 300);
        speakText(shortReply);
      }

      // Save response to memory
      if (settings.autoSave) {
        memoryStore.autoSaveFromMessage(fullContent, activeRoomId, agentToUse.id);
      }

      // Auto-generate skill if task was complex
      if (settings.skillAutoGenerate && fullContent.length > 200 && historyMsgs.length > 2) {
        const hasCode = fullContent.includes('```');
        const hasSteps = fullContent.includes('1.') && fullContent.includes('2.');
        if (hasCode || hasSteps) {
          skillStore.createSkillFromTask(
            text.slice(0, 40),
            fullContent.split('\n').filter(l => l.match(/^\d+\./)).slice(0, 5).map(l => l.replace(/^\d+\.\s*/, '')),
            'autre'
          );
        }
      }

      // Notify if in ADHD mode
      if (activeRoom?.type === 'adhd' && activeRoom.adhdConfig?.pomodoroEnabled) {
        addToast({ type: 'success', message: '✅ Tâche complétée ! Prochaine étape ?' });
      }

    } catch (err: any) {
      if (err.name === 'AbortError') {
        addToast({ type: 'info', message: 'Réponse interrompue' });
      } else {
        updateMessage(activeRoomId, assistantId, `❌ Erreur: ${err.message}`);
        addToast({ type: 'error', message: err.message });
      }
    } finally {
      setStreaming(false);
      setAbortController(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  // Render
  return (
    <div className={`room-layout ${activeRoom?.type === 'adhd' ? 'adhd-mode' : ''}`}>
      {/* Room Sidebar */}
      <div className="room-sidebar">
        <div className="room-sidebar-header">
          <h2>🏠 Salons</h2>
        </div>
        <div className="room-list">
          {rooms.map((room) => (
            <div
              key={room.id}
              className={`room-item ${room.id === activeRoomId ? 'active' : ''} room-type-${room.type}`}
              onClick={() => setActiveRoom(room.id)}
            >
              <span className="room-icon">{room.icon}</span>
              <div className="room-item-info">
                <div className="room-item-name">{room.name}</div>
                {room.lastMessage && (
                  <div className="room-item-last">{room.lastMessage.slice(0, 40)}...</div>
                )}
              </div>
              {room.messageCount > 0 && (
                <span className="room-badge">{room.messageCount}</span>
              )}
            </div>
          ))}
        </div>

        {/* ADHD Pomodoro */}
        {activeRoom?.type === 'adhd' && (
          <div className="pomodoro-widget">
            <div className="pomodoro-header">
              <span>🍅 Pomodoro</span>
              <span className={`pomodoro-status ${pomodoro.isBreak ? 'break' : ''}`}>
                {pomodoro.isBreak ? '☕ Pause' : '🎯 Focus'}
              </span>
            </div>
            <div className="pomodoro-timer">
              {Math.floor(pomodoro.timeRemaining / 60)}:{(pomodoro.timeRemaining % 60).toString().padStart(2, '0')}
            </div>
            <div className="pomodoro-controls">
              {!pomodoro.isRunning ? (
                <button className="btn btn-primary btn-sm" onClick={() => pomodoro.start()}>
                  {pomodoro.timeRemaining === pomodoro.totalTime ? '▶ Démarrer' : '▶ Reprendre'}
                </button>
              ) : (
                <button className="btn btn-secondary btn-sm" onClick={() => pomodoro.pause()}>⏸ Pause</button>
              )}
              <button className="btn btn-xs btn-secondary" onClick={() => pomodoro.stop()}>⏹</button>
            </div>
            <div className="pomodoro-sessions">Sessions: {pomodoro.sessionsCompleted} ✅</div>
            {pomodoro.currentTask && (
              <div className="pomodoro-task">📌 {pomodoro.currentTask}</div>
            )}
          </div>
        )}

        {/* Agent info */}
        {activeRoom && (
          <div className="agent-info-widget">
            <div className="agent-info-header">
              <span className="agent-icon">{currentAgent.icon}</span>
              <span className="agent-name">{currentAgent.name}</span>
            </div>
            <div className="agent-desc">{currentAgent.description}</div>
            {currentAgent.skills.length > 0 && (
              <div className="agent-skills">
                {currentAgent.skills.map(s => (
                  <span key={s} className="skill-tag">{s}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="room-main">
        {activeRoom ? (
          <>
            <div className="room-header">
              <div className="room-header-info">
                <h2>{activeRoom.icon} {activeRoom.name}</h2>
                <div className="room-header-meta">
                  <span>{currentAgent.icon} {currentAgent.name}</span>
                  <span>{roomMessages.length} messages</span>
                  {isStreaming && <span className="streaming-badge">● Stream</span>}
                </div>
              </div>
              <div className="room-header-actions">
                <ModelSelector
                  currentModel={selectedModel}
                  onChange={(m) => { setSelectedModel(m); settings.setDefaultModel(m); }}
                  disabled={isStreaming}
                />
              </div>
            </div>

            <div className="room-messages">
              {roomMessages.length === 0 && (
                <div className="room-welcome">
                  <div className="room-welcome-icon">{activeRoom.icon}</div>
                  <h3>Bienvenue dans {activeRoom.name}</h3>
                  <p>{activeRoom.description}</p>
                  {activeRoom.type === 'adhd' && (
                    <div className="adhd-hint">
                      🎯 Mode Focus activé — Tâches courtes, pas de distraction
                    </div>
                  )}
                </div>
              )}
              {roomMessages.map((msg: any) => (
                <div key={msg.id} className={`message message-${msg.role}`}>
                  <div className="message-avatar">
                    {msg.role === 'user' ? '🧑' : (msg.agentId ? AGENTS[msg.agentId as AgentId]?.icon || '🤖' : '🤖')}
                  </div>
                  <div className="message-content">
                    <div className="message-header">
                      <span className="message-role">
                        {msg.role === 'user' ? 'Vous' : (msg.agentId ? AGENTS[msg.agentId as AgentId]?.name || 'Assistant' : 'Assistant')}
                      </span>
                      <span className="message-time">
                        {new Date(msg.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.model && <span className="message-model">{msg.model}</span>}
                    </div>
                    <div className="message-text">
                      {msg.content || (msg.streaming ? <span className="typing-indicator">▌</span> : '')}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Voice display */}
            {(voiceStore.isListening || voiceStore.transcript) && (
              <div className="voice-bar">
                <span className={voiceStore.isListening ? 'voice-listening' : ''}>
                  {voiceStore.isListening ? '🎙️ Écoute...' : '✅ Reconnu:'}
                </span>
                <span className="voice-text">
                  {voiceStore.transcript}
                  {voiceStore.interimTranscript && <em> {voiceStore.interimTranscript}</em>}
                </span>
              </div>
            )}

            <div className="room-input-area">
              <div className="room-input-row">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={activeRoom.type === 'adhd'
                    ? '🎯 Décrivez votre prochaine micro-tâche...'
                    : 'Tapez votre message... (Entrée pour envoyer, Shift+Entrée = nouvelle ligne)'
                  }
                  rows={2}
                  disabled={isStreaming}
                  className="room-input"
                />
                <div className="input-actions">
                  <button
                    className={`btn btn-icon ${voiceStore.isListening ? 'btn-danger' : 'btn-secondary'}`}
                    onClick={voiceStore.isListening ? stopListening : startListening}
                    title={voiceStore.isListening ? 'Arrêter' : 'Reconnaissance vocale'}
                  >
                    {voiceStore.isListening ? '⏹' : '🎙️'}
                  </button>
                  {isStreaming ? (
                    <button className="btn btn-danger" onClick={abortStream}>⏹ Stop</button>
                  ) : (
                    <button className="btn btn-primary" onClick={sendMessage} disabled={!input.trim() && !voiceStore.transcript.trim()}>
                      🚀 Envoyer
                    </button>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="room-empty">
            <h3>Sélectionnez un salon pour commencer</h3>
          </div>
        )}
      </div>
    </div>
  );
}
