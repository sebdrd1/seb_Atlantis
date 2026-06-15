// @ts-nocheck
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { FileNode } from "../types";

interface FileState {
  rootPath: string | null;
  tree: FileNode | null;
  expandedPaths: Set<string>;
  selectedPath: string | null;
  loading: boolean;
  error: string | null;
  recentFiles: string[];

  setRootPath: (path: string) => Promise<void>;
  loadTree: (path: string) => Promise<void>;
  toggleExpand: (path: string) => void;
  setSelected: (path: string | null) => void;
  refresh: () => Promise<void>;
  navigateUp: () => void;
  clearError: () => void;

  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  createFile: (parentPath: string, name: string) => Promise<void>;
  createFolder: (parentPath: string, name: string) => Promise<void>;
  deleteItem: (path: string) => Promise<void>;
  renameItem: (path: string, newName: string) => Promise<void>;
}

// Mock file tree for browser mode (no Tauri backend)
const mockTree: FileNode = {
  name: "racine",
  path: "/",
  isDirectory: true,
  children: [
    {
      name: "Documents",
      path: "/Documents",
      isDirectory: true,
      children: [
        { name: "rapport.pdf", path: "/Documents/rapport.pdf", isDirectory: false, size: 245000, modifiedAt: Date.now() - 86400000 },
        { name: "notes.txt", path: "/Documents/notes.txt", isDirectory: false, size: 1200, modifiedAt: Date.now() - 3600000 },
      ],
    },
    {
      name: "Images",
      path: "/Images",
      isDirectory: true,
      children: [
        { name: "photo1.jpg", path: "/Images/photo1.jpg", isDirectory: false, size: 1500000, modifiedAt: Date.now() - 172800000 },
        { name: "photo2.png", path: "/Images/photo2.png", isDirectory: false, size: 2800000, modifiedAt: Date.now() - 259200000 },
      ],
    },
    {
      name: "Projets",
      path: "/Projets",
      isDirectory: true,
      children: [
        {
          name: "seb_Atlantis",
          path: "/Projets/seb_Atlantis",
          isDirectory: true,
          children: [
            { name: "index.html", path: "/Projets/seb_Atlantis/index.html", isDirectory: false, size: 4500 },
            { name: "App.tsx", path: "/Projets/seb_Atlantis/App.tsx", isDirectory: false, size: 3200 },
            { name: "package.json", path: "/Projets/seb_Atlantis/package.json", isDirectory: false, size: 950 },
          ],
        },
      ],
    },
    { name: "readme.md", path: "/readme.md", isDirectory: false, size: 890, modifiedAt: Date.now() - 604800000 },
  ],
};

export const useFileStore = create<FileState>()(
  persist(
    (set, get) => ({
      rootPath: null,
      tree: null,
      expandedPaths: new Set(),
      selectedPath: null,
      loading: false,
      error: null,
      recentFiles: [],

      setRootPath: async (path) => {
        set({ rootPath: path, loading: true, error: null });
        await get().loadTree(path);
      },

      loadTree: async (_path) => {
        set({ loading: true, error: null });
        // In browser mode, use mock data
        // In Tauri mode, this would invoke the backend
        set({ tree: mockTree, loading: false });

        // Try to use File System Access API if available
        try {
          if ("showDirectoryPicker" in window) {
            // Will be triggered by user action, not here
          }
        } catch {
          // Not supported
        }
      },

      toggleExpand: (path) =>
        set((state) => {
          const newExpanded = new Set(state.expandedPaths);
          if (newExpanded.has(path)) newExpanded.delete(path);
          else newExpanded.add(path);
          return { expandedPaths: newExpanded };
        }),

      setSelected: (path) => set({ selectedPath: path }),

      refresh: async () => {
        const { rootPath } = get();
        if (rootPath) await get().loadTree(rootPath);
      },

      navigateUp: () => {
        const { rootPath } = get();
        if (rootPath) {
          const parts = rootPath.split("/").filter(Boolean);
          parts.pop();
          const parent = "/" + parts.join("/");
          if (parent !== rootPath) get().loadTree(parent || "/");
        }
      },

      clearError: () => set({ error: null }),

      readFile: async (path) => {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          return await invoke<string>('read_file', { path });
        } catch (e) {
          throw new Error(`Erreur lecture: ${e instanceof Error ? e.message : 'Inconnue'}`);
        }
      },

      writeFile: async (path, content) => {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          await invoke('write_file', { path, content });
        } catch (e) {
          throw new Error(`Erreur écriture: ${e instanceof Error ? e.message : 'Inconnue'}`);
        }
      },

      createFile: async (parentPath, name) => {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          await invoke('create_file', { parentPath, name });
        } catch (e) {
          throw new Error(`Erreur création fichier: ${e instanceof Error ? e.message : 'Inconnue'}`);
        }
      },

      createFolder: async (parentPath, name) => {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          await invoke('create_folder', { parentPath, name });
        } catch (e) {
          throw new Error(`Erreur création dossier: ${e instanceof Error ? e.message : 'Inconnue'}`);
        }
      },

      deleteItem: async (path) => {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          await invoke('delete_item', { path });
        } catch (e) {
          throw new Error(`Erreur suppression: ${e instanceof Error ? e.message : 'Inconnue'}`);
        }
      },

      renameItem: async (path, newName) => {
        const { invoke } = await import('@tauri-apps/api/core');
        try {
          await invoke('rename_item', { path, newName });
        } catch (e) {
          throw new Error(`Erreur renommage: ${e instanceof Error ? e.message : 'Inconnue'}`);
        }
      },
    }),
    {
      name: "seb-atlantis-files",
      storage: createJSONStorage(() => localStorage),
      version: 1,
      partialize: (state) => ({
        rootPath: state.rootPath,
        recentFiles: state.recentFiles,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.expandedPaths = new Set();
        }
      },
    }
  )
);