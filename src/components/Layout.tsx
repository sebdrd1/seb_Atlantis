import { Link, useLocation, Outlet } from "react-router-dom";
import { useSettingsStore } from "../stores/settingsStore";
import type { ViewMode } from "../types";
import AtlantisLogo from "./AtlantisLogo";

const navItems: { path: string; icon: string; label: string; key: ViewMode }[] = [
  { path: "/",        icon: "💬", label: "Salons",    key: "rooms" },
  { path: "/skills",  icon: "✨", label: "Skills",    key: "skills" },
  { path: "/memoire", icon: "🧠", label: "Mémoire",   key: "memory" },
  { path: "/fichiers",icon: "📁", label: "Fichiers",  key: "files" },
  { path: "/vps",     icon: "🖥️", label: "VPS",       key: "vps" },
  { path: "/settings",icon: "⚙️", label: "Réglages",  key: "settings" },
];

export default function Layout() {
  const location = useLocation();
  const { theme } = useSettingsStore();

  return (
    <div className={`app-container theme-${theme}`}>
      {/* Header avec Logo */}
      <header className="app-header">
        <div className="header-left">
          <AtlantisLogo size={36} variant="icon" />
          <h1>seb_Atlantis</h1>
        </div>
        <div className="header-right">
          <span className="badge">v4.0</span>
          <span className="badge badge-multi">Multi-Agent</span>
        </div>
      </header>

      {/* Sidebar avec Logo en haut */}
      <nav className="sidebar">
        <div className="sidebar-logo">
          <AtlantisLogo size={48} variant="trident" />
        </div>
        <ul>
          {navItems.map((item) => (
            <li key={item.path} className={location.pathname === item.path ? "active" : ""}>
              <Link to={item.path}>
                <span className="nav-icon">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        <div className="sidebar-footer">
          <div className="status-dot online" />
          <span>En ligne</span>
        </div>
      </nav>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}
