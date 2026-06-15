import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastProvider } from "./components/ui";
import Layout from "./components/Layout";
import RoomChatPage from "./pages/RoomChatPage";
import FilesPage from "./pages/FilesPage";
import MemoryPage from "./pages/MemoryPage";
import SkillsPage from "./pages/SkillsPage";
import SettingsPage from "./pages/SettingsPage";
import "./App.css";

export default function App() {
  return (
    <HashRouter>
      <ToastProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<RoomChatPage />} />
            <Route path="fichiers" element={<FilesPage />} />
            <Route path="memoire" element={<MemoryPage />} />
            <Route path="skills" element={<SkillsPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </HashRouter>
  );
}
