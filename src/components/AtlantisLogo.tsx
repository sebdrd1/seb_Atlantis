// Composant Logo Atlantis — Trident stylisé SVG
// Basé sur le logo officiel : trident cyan, temple grec, circuit, anneau doré

interface LogoProps {
  size?: number;
  variant?: 'full' | 'icon' | 'trident';
  className?: string;
}

export default function AtlantisLogo({ size = 40, variant = 'full', className = '' }: LogoProps) {
  if (variant === 'trident') {
    return (
      <svg width={size} height={size} viewBox="0 0 100 100" className={className}>
        {/* Trident simplifié */}
        <defs>
          <linearGradient id="tridentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#0088cc" />
          </linearGradient>
          <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffd700" />
            <stop offset="100%" stopColor="#d4af37" />
          </linearGradient>
          <filter id="glow">
            <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
            <feMerge>
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
        </defs>
        {/* Prong gauche */}
        <path d="M35 15 L35 55 L30 55 L38 75 L42 55 L37 55 L37 15 Z" fill="url(#tridentGrad)" filter="url(#glow)" />
        {/* Prong centre */}
        <path d="M46 10 L46 55 L41 55 L50 80 L59 55 L54 55 L54 10 Z" fill="url(#tridentGrad)" filter="url(#glow)" />
        {/* Prong droit */}
        <path d="M58 15 L58 55 L53 55 L58 75 L62 55 L59 55 L59 15 Z" fill="url(#tridentGrad)" filter="url(#glow)" />
        {/* Base gemme */}
        <polygon points="50,78 45,85 50,92 55,85" fill="url(#goldGrad)" />
        {/* Circuit line */}
        <line x1="50" y1="92" x2="50" y2="98" stroke="#00e5ff" strokeWidth="1.5" />
        <circle cx="50" cy="98" r="2" fill="#00e5ff" />
      </svg>
    );
  }

  if (variant === 'icon') {
    return (
      <svg width={size} height={size} viewBox="0 0 32 32" className={className}>
        <defs>
          <linearGradient id="iconGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00e5ff" />
            <stop offset="100%" stopColor="#0066aa" />
          </linearGradient>
        </defs>
        <circle cx="16" cy="16" r="14" fill="#003344" stroke="#d4af37" strokeWidth="1" />
        {/* Mini trident */}
        <path d="M12 8 L12 18 L10 18 L14 26 L18 18 L16 18 L16 8 Z" fill="url(#iconGrad)" />
        <circle cx="14" cy="26" r="1.5" fill="#d4af37" />
      </svg>
    );
  }

  // Full logo
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" className={className}>
      <defs>
        <linearGradient id="fullTridentGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#00e5ff" />
          <stop offset="50%" stopColor="#4dd0e1" />
          <stop offset="100%" stopColor="#0088cc" />
        </linearGradient>
        <linearGradient id="fullGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffd700" />
          <stop offset="50%" stopColor="#d4af37" />
          <stop offset="100%" stopColor="#c5a059" />
        </linearGradient>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#005f73" />
          <stop offset="100%" stopColor="#002b36" />
        </linearGradient>
        <filter id="fullGlow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <clipPath id="circleClip">
          <circle cx="100" cy="100" r="90" />
        </clipPath>
      </defs>

      {/* Outer ring */}
      <circle cx="100" cy="100" r="95" fill="none" stroke="url(#fullGoldGrad)" strokeWidth="4" />
      <circle cx="100" cy="100" r="90" fill="url(#bgGrad)" />

      {/* City silhouette */}
      <g clipPath="url(#circleClip)" opacity="0.4">
        {/* Temple gauche */}
        <rect x="30" y="120" width="40" height="50" fill="#001a23" />
        <rect x="35" y="115" width="5" height="55" fill="#001a23" />
        <rect x="45" y="115" width="5" height="55" fill="#001a23" />
        <rect x="55" y="115" width="5" height="55" fill="#001a23" />
        <polygon points="30,120 50,105 70,120" fill="#001a23" />
        {/* Dome droit */}
        <rect x="130" y="125" width="35" height="45" fill="#001a23" />
        <ellipse cx="147" cy="125" rx="18" ry="12" fill="#001a23" />
        {/* Buildings */}
        <rect x="80" y="130" width="15" height="40" fill="#001a23" />
        <rect x="105" y="128" width="15" height="42" fill="#001a23" />
      </g>

      {/* Trident */}
      <g filter="url(#fullGlow)">
        {/* Prong gauche */}
        <path d="M72 30 L72 95 L65 95 L80 130 L87 95 L80 95 L80 30 Z" fill="url(#fullTridentGrad)" />
        {/* Prong centre */}
        <path d="M90 20 L90 95 L83 95 L100 145 L117 95 L110 95 L110 20 Z" fill="url(#fullTridentGrad)" />
        {/* Prong droit */}
        <path d="M112 30 L112 95 L105 95 L120 130 L127 95 L120 95 L120 30 Z" fill="url(#fullTridentGrad)" />
      </g>

      {/* Gem base */}
      <polygon points="100,150 92,162 100,174 108,162" fill="url(#fullGoldGrad)" />

      {/* Circuit stem */}
      <line x1="100" y1="174" x2="100" y2="185" stroke="#00e5ff" strokeWidth="2" />
      <circle cx="100" cy="188" r="4" fill="none" stroke="#00e5ff" strokeWidth="1.5" />
      <circle cx="100" cy="188" r="2" fill="#00e5ff" />

      {/* Circuit traces to city */}
      <line x1="100" y1="188" x2="50" y2="170" stroke="#00e5ff" strokeWidth="0.8" opacity="0.5" />
      <line x1="100" y1="188" x2="150" y2="170" stroke="#00e5ff" strokeWidth="0.8" opacity="0.5" />

      {/* Glyphs on ring */}
      <g fill="url(#fullGoldGrad)" fontSize="8" fontFamily="serif" opacity="0.8">
        <text x="100" y="12" textAnchor="middle">Α</text>
        <text x="130" y="18" textAnchor="middle">Τ</text>
        <text x="155" y="32" textAnchor="middle">Λ</text>
        <text x="175" y="52" textAnchor="middle">Α</text>
        <text x="188" y="75" textAnchor="middle">Ν</text>
        <text x="195" y="100" textAnchor="middle">Τ</text>
        <text x="188" y="125" textAnchor="middle">Ι</text>
        <text x="175" y="148" textAnchor="middle">Σ</text>
        <text x="155" y="168" textAnchor="middle">Ω</text>
        <text x="130" y="182" textAnchor="middle">Ρ</text>
        <text x="100" y="188" textAnchor="middle">Χ</text>
        <text x="70" y="182" textAnchor="middle">Θ</text>
        <text x="45" y="168" textAnchor="middle">Ε</text>
        <text x="25" y="148" textAnchor="middle">Ο</text>
        <text x="12" y="125" textAnchor="middle">Σ</text>
        <text x="5" y="100" textAnchor="middle">Φ</text>
        <text x="12" y="75" textAnchor="middle">Ω</text>
        <text x="25" y="52" textAnchor="middle">Ν</text>
        <text x="45" y="32" textAnchor="middle">Η</text>
        <text x="70" y="18" textAnchor="middle">Σ</text>
      </g>
    </svg>
  );
}
