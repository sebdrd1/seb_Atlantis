// Types partagés pour seb_Atlantis v4.0 — Multi-Agents, Skills, Salons, Mémoire, Vocal, ADHD

// ============ CORE ============

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'agent';
  content: string;
  timestamp: number;
  streaming?: boolean;
  model?: string;
  agentId?: string;
  roomId?: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  createdAt: number;
  updatedAt: number;
}

// ============ ROOMS / SALONS ============

export type RoomType = 'general' | 'specialist' | 'adhd' | 'private';

export interface Room {
  id: string;
  name: string;
  icon: string;
  type: RoomType;
  description: string;
  agentIds: string[];
  modelOverride?: string;
  systemPrompt?: string;
  createdAt: number;
  updatedAt: number;
  messageCount: number;
  lastMessage?: string;
  lastMessageAt?: number;
  // ADHD-specific
  adhdConfig?: RoomADHDConfig;
}

export interface RoomADHDConfig {
  focusMode: boolean;
  pomodoroEnabled: boolean;
  pomodoroDuration: number; // minutes
  breakDuration: number;
  maxTasksVisible: number;
  highlightColor: string;
  shortReplies: boolean;
  taskChecklist: boolean;
}

export const DEFAULT_ROOMS: Room[] = [
  {
    id: 'general',
    name: 'Salon Général',
    icon: '🌊',
    type: 'general',
    description: 'Discussion libre avec l\'orchestrateur',
    agentIds: ['orchestrator'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  },
  {
    id: 'godot',
    name: 'Godot Dev',
    icon: '🎮',
    type: 'specialist',
    description: 'Développement Godot — GDScript, C#, shaders, gameplay',
    agentIds: ['godot'],
    systemPrompt: 'Tu es un expert Godot 4.x. Tu aides avec GDScript, C#, shaders, architecture de jeu, optimization. Réponses concrètes avec code.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  },
  {
    id: 'web',
    name: 'Web & Recherche',
    icon: '🌐',
    type: 'specialist',
    description: 'Recherche web, scraping, HTML/CSS/JS, APIs',
    agentIds: ['web'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  },
  {
    id: 'debug',
    name: 'Debug & Diag',
    icon: '🐛',
    type: 'specialist',
    description: 'Debugging, logs, diagnostics système, réseaux',
    agentIds: ['debug'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  },
  {
    id: 'deploy',
    name: 'Déploiement',
    icon: '🚀',
    type: 'specialist',
    description: 'Déploiement VPS, Docker, CI/CD, nginx, Tailscale',
    agentIds: ['deploy'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  },
  {
    id: 'memory',
    name: 'Mémoire',
    icon: '🧠',
    type: 'specialist',
    description: 'Recherche dans la mémoire, skills, historique',
    agentIds: ['memory'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  },
  {
    id: 'adhd',
    name: 'Mode Focus',
    icon: '🎯',
    type: 'adhd',
    description: 'Mode adapté ADHD — Focus, Pomodoro, tâches courtes',
    agentIds: ['orchestrator'],
    adhdConfig: {
      focusMode: true,
      pomodoroEnabled: true,
      pomodoroDuration: 25,
      breakDuration: 5,
      maxTasksVisible: 3,
      highlightColor: '#f59e0b',
      shortReplies: true,
      taskChecklist: true,
    },
    systemPrompt: 'Tu es un assistant bienveillant adapté au ADHD. Réponses COURTES et STRUCTURÉS. Utilise des emojis, des checklists, des étapes numérotées. Pas de paragraphes longs. 1 idée = 1 phrase. Sois encourageant.',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messageCount: 0,
  },
];

// ============ AGENTS ============

export type AgentId =
  | 'orchestrator'
  | 'godot'
  | 'web'
  | 'debug'
  | 'vision'
  | 'deploy'
  | 'memory'
  | 'voice'
  | 'skill-creator';

export interface Agent {
  id: AgentId;
  name: string;
  icon: string;
  description: string;
  model: string;
  systemPrompt: string;
  keywords: string[];
  skills: string[];
  temperature: number;
  maxTokens: number;
  color: string;
}

export const AGENTS: Record<AgentId, Agent> = {
  orchestrator: {
    id: 'orchestrator',
    name: 'Orchestrateur',
    icon: '🎭',
    description: 'Route les messages vers le bon agent',
    model: 'google/gemma-3-27b-it:free',
    systemPrompt: 'Tu es l\'orchestrateur. Analyse le message de l\'utilisateur et route-le vers l\'agent le plus approprié. Si le message concerne le web → @web. Si ça concerne Godot → @godot. Si c\'est du debug → @debug. Si c\'est du déploiement → @deploy. Si c\'est une question mémoire → @memory. Sinon, réponds toi-même de façon concise.',
    keywords: [],
    skills: [],
    temperature: 0.7,
    maxTokens: 2048,
    color: '#4a4ae0',
  },
  godot: {
    id: 'godot',
    name: 'Godot Expert',
    icon: '🎮',
    description: 'Expert Godot 4.x',
    model: 'google/gemma-3-27b-it:free',
    systemPrompt: `Tu es un expert en Godot 4.x. Tu maîtrises :
- GDScript (avancé) et C#
- Shaders (spatial, canvas, particles)
- Architecture ECS, nodes, signals
- Navigation, animation, physics
- Export multi-platform
- Optimization (profiling, pooling, LOD)

Réponds avec du code concret, des exemples, des best practices. En français sauf le code.`,
    keywords: ['godot', 'gdscript', 'game', 'jeu', 'node', 'signal', 'shader', 'sprite', 'animation', 'physics', 'tilemap', 'multiplayer', 'nakama'],
    skills: ['gdscript', 'godot-architecture', 'shaders'],
    temperature: 0.3,
    maxTokens: 4096,
    color: '#4fc1ff',
  },
  web: {
    id: 'web',
    name: 'Web Master',
    icon: '🌐',
    description: 'Recherche web, scraping, développement web',
    model: 'google/gemma-3-27b-it:free',
    systemPrompt: `Tu es un expert web. Tu maîtrises :
- HTML/CSS/JS (modern, ES2024)
- React, Vue, Svelte, Next.js, Astro
- Node.js, Python web (FastAPI, Flask)
- APIs REST, GraphQL, WebSockets
- Sécurité web (CSP, CORS, XSS, CSRF)
- Performance (Core Web Vitals, lazy loading)
- SEO, accessibilité

Donne du code prêt à l'emploi, des commandes curl, des requêtes.`,
    keywords: ['web', 'html', 'css', 'javascript', 'react', 'vue', 'node', 'api', 'http', 'url', 'scraping', 'fetch', 'curl', 'seo', 'frontend', 'backend', 'site'],
    skills: ['web-dev', 'scraping', 'api-design'],
    temperature: 0.5,
    maxTokens: 4096,
    color: '#22c55e',
  },
  debug: {
    id: 'debug',
    name: 'Debug Doctor',
    icon: '🐛',
    description: 'Debugging, logs, diagnostics',
    model: 'google/gemma-3-27b-it:free',
    systemPrompt: `Tu es un expert debugging. Tu maîtrises :
- Python, JS/TS, Rust, C/C++, GDScript debugging
- Logs analysis (syslog, journalctl, Windows Event Viewer)
- Network debugging (tcpdump, wireshark, curl, ping, traceroute)
- Performance profiling (cProfile, py-spy, perf, chrome devtools)
- Memory leaks, CPU spikes, deadlocks
- Docker/Podman debugging
- Error stack traces reading

Donne des commandes précises, des checklists de diagnostic, des solutions step-by-step.`,
    keywords: ['bug', 'error', 'debug', 'log', 'crash', 'exception', 'traceback', 'fail', 'broken', 'diagnostic', 'performance', 'slow', 'hang', 'freeze', 'memory leak'],
    skills: ['debugging', 'log-analysis', 'profiling'],
    temperature: 0.3,
    maxTokens: 4096,
    color: '#ef4444',
  },
  vision: {
    id: 'vision',
    name: 'Vision',
    icon: '👁️',
    description: 'Analyse d\'images et screenshots',
    model: 'google/gemini-1.5-flash',
    systemPrompt: 'Tu es un expert en analyse d\'images. Décris précisément ce que tu vois, identifie les éléments, les problèmes, les patterns. Suggère des améliorations si pertinent.',
    keywords: ['image', 'screenshot', 'photo', 'capture', 'voir', 'afficher', 'visuel', 'écran'],
    skills: ['image-analysis'],
    temperature: 0.5,
    maxTokens: 2048,
    color: '#a855f7',
  },
  deploy: {
    id: 'deploy',
    name: 'Deploy Ops',
    icon: '🚀',
    description: 'Déploiement, Docker, CI/CD, VPS',
    model: 'google/gemma-3-27b-it:free',
    systemPrompt: `Tu es un expert DevOps/Déploiement. Tu maîtrises :
- Docker & Docker Compose
- nginx, Caddy, Traefik (reverse proxy)
- CI/CD (GitHub Actions, GitLab CI)
- SSH, SCP, rsync
- Tailscale, WireGuard
- Firewall (ufw, iptables)
- Monitoring (htop, glances, netdata)
- Let's Encrypt, DNS
- Windows Server, Linux (Ubuntu, Debian, Alpine)

Donne des commandes copy-paste ready, des docker-compose.yml, des scripts.`,
    keywords: ['deploy', 'docker', 'vps', 'ssh', 'nginx', 'server', 'hosting', 'ci/cd', 'pipeline', 'linux', 'ubuntu', 'debian', 'tailscale', 'dns', 'ssl', 'https'],
    skills: ['docker', 'nginx', 'ssh-ops', 'ci-cd'],
    temperature: 0.3,
    maxTokens: 4096,
    color: '#f59e0b',
  },
  memory: {
    id: 'memory',
    name: 'Mémoire',
    icon: '🧠',
    description: 'Recherche dans la mémoire et les skills',
    model: 'google/gemma-3-27b-it:free',
    systemPrompt: 'Tu es le gestionnaire de mémoire. Tu recherches dans les conversations passées, les skills, les notes. Tu résumés et tu trouves les informations pertinentes.',
    keywords: ['mémoire', 'rappel', 'historique', 'skill', 'note', 'souvenir', 'précédent', 'avant', 'déjà'],
    skills: ['memory-search'],
    temperature: 0.5,
    maxTokens: 2048,
    color: '#06b6d4',
  },
  'voice': {
    id: 'voice',
    name: 'Vocal',
    icon: '🎙️',
    description: 'Reconnaissance vocale et TTS',
    model: 'google/gemma-3-27b-it:free',
    systemPrompt: 'Tu es un assistant vocal. Réponses courtes et naturelles, comme une conversation orale.',
    keywords: [],
    skills: ['voice'],
    temperature: 0.7,
    maxTokens: 1024,
    color: '#ec4899',
  },
  'skill-creator': {
    id: 'skill-creator',
    name: 'Skill Creator',
    icon: '✨',
    description: 'Crée des skills Markdown automatiquement',
    model: 'google/gemma-3-27b-it:free',
    systemPrompt: `Tu es un créateur de skills. Quand l'utilisateur accompli une tâche complexe réussie, tu créés automatiquement un skill en format SKILL.md.

Format du skill:
---
name: nom-du-skill
description: Description courte
category: devops|dev|data|media|autre
---

# Nom du Skill

## Description
## Quand l'utiliser
## Étapes
1. ...
## Résultat attendu
## Erreurs connues

Génère toujours un skill complet et actionnable.`,
    keywords: ['skill', 'créer skill', 'nouveau skill', 'apprendre', 'automatiser'],
    skills: ['skill-creation'],
    temperature: 0.5,
    maxTokens: 4096,
    color: '#8b5cf6',
  },
};

// ============ SKILLS ============

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: 'devops' | 'dev' | 'data' | 'media' | 'adhd' | 'autre';
  content: string; // Markdown content
  tags: string[];
  createdAt: number;
  updatedAt: number;
  usageCount: number;
  autoGenerated: boolean;
}

// ============ EXTENDED MEMORY ============

export interface MemoryEntry {
  id: string;
  key: string;
  value: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
  source?: string; // which room/agent created it
  importance?: number; // 1-5
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  score: number;
  snippet: string;
}

// ============ VOICE ============

export interface VoiceState {
  isListening: boolean;
  isSpeaking: boolean;
  transcript: string;
  interimTranscript: string;
  language: 'fr-FR' | 'en-US';
  voiceEnabled: boolean;
}

// ============ ADHD POMODORO ============

export interface PomodoroState {
  isRunning: boolean;
  isBreak: boolean;
  timeRemaining: number; // seconds
  totalTime: number;
  sessionsCompleted: number;
  currentTask: string;
}

// ============ PROVIDERS ============

export type ProviderId =
  | 'openrouter'
  | 'huggingface'
  | 'google'
  | 'anthropic'
  | 'openai'
  | 'together'
  | 'groq'
  | 'cohere'
  | 'mistral'
  | 'perplexity'
  | 'xai'
  | 'ollama';

export interface ProviderConfig {
  id: ProviderId;
  name: string;
  baseUrl: string;
  apiKeyName: string;
  models: ModelConfig[];
  authHeader: (key: string) => Record<string, string>;
  streamFormat: 'openai' | 'anthropic' | 'google' | 'huggingface';
  isLocal: boolean;
  freeOnly: boolean;
}

export interface ModelConfig {
  id: string;
  name: string;
  provider: ProviderId;
  context: string;
  free?: boolean;
  pricing?: { input: number; output: number };
  capabilities?: ('vision' | 'function-calling' | 'reasoning' | 'code')[];
}

export interface ApiKeyConfig {
  provider: ProviderId;
  key: string;
  enabled: boolean;
}

// ============ SETTINGS ============

export interface Settings {
  apiKeys: ApiKeyConfig[];
  defaultModel: string;
  defaultProvider: ProviderId;
  theme: 'dark' | 'light' | 'system';
  language: 'fr' | 'en';
  autoSave: boolean;
  notifications: boolean;
  voiceEnabled: boolean;
  voiceLanguage: 'fr-FR' | 'en-US';
  adhdMode: boolean;
  skillAutoGenerate: boolean;
  orchestratorEnabled: boolean;
}

// ============ VPS ============

export interface VPSConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'key';
  password?: string;
  keyPath?: string;
  keyPassphrase?: string;
  tailscaleIp?: string;
}

export interface VPSStatus {
  connected: boolean;
  hostname?: string;
  uptime?: number;
  load: number[];
  memory: { total: number; free: number; used: number };
  disk?: { total: number; free: number; used: number };
  gpu?: { name: string; memory: number; used: number }[];
  cpuUsage?: number;
  lastCheck?: number;
}

// ============ UI ============

export interface FileNode {
  name: string;
  path: string;
  isDirectory: boolean;
  size?: number;
  modifiedAt?: number;
  children?: FileNode[];
}

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  duration?: number;
}

export type ViewMode = 'chat' | 'rooms' | 'agents' | 'memory' | 'skills' | 'files' | 'vps' | 'settings';
