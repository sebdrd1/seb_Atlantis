// @ts-nocheck
import { useState, useEffect } from "react";
import { useFileStore } from "../stores/fileStore";
import { useToast, EmptyState, formatBytes, formatDate } from "../components/ui";
import type { FileNode } from "../types";

export default function FilesPage() {
  const { tree, expandedPaths, selectedPath, loading, error, setRootPath, loadTree, toggleExpand, setSelected, refresh } = useFileStore();
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<"tree" | "grid">("tree");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    loadTree("/");
  }, []);

  const handlePickDirectory = async () => {
    try {
      // @ts-expect-error File System Access API
      const dirHandle = await window.showDirectoryPicker();
      setRootPath(dirHandle.name);
      addToast({ type: "success", message: `Dossier ouvert: ${dirHandle.name}` });
      loadTree(dirHandle.name);
    } catch (err: any) {
      if (err.name !== "AbortError") {
        addToast({ type: "error", message: `Erreur: ${err.message}` });
      }
    }
  };

  const getFileIcon = (name: string): string => {
    const ext = name.split(".").pop()?.toLowerCase();
    const icons: Record<string, string> = {
      pdf: "ðŸ“„", txt: "ðŸ“", md: "ðŸ“", json: "ðŸ“‹", yaml: "ðŸ“‹", yml: "ðŸ“‹",
      jpg: "ðŸ–¼ï¸", jpeg: "ðŸ–¼ï¸", png: "ðŸ–¼ï¸", gif: "ðŸ–¼ï¸", svg: "ðŸ–¼ï¸", webp: "ðŸ–¼ï¸",
      mp4: "ðŸŽ¬", mkv: "ðŸŽ¬", mov: "ðŸŽ¬", avi: "ðŸŽ¬",
      mp3: "ðŸŽµ", wav: "ðŸŽµ", flac: "ðŸŽµ",
      zip: "ðŸ“¦", tar: "ðŸ“¦", gz: "ðŸ“¦", rar: "ðŸ“¦",
      py: "ðŸ", ts: "ðŸ“˜", tsx: "ðŸ“˜", js: "ðŸ“™", jsx: "ðŸ“™", html: "ðŸŒ", css: "ðŸŽ¨",
      exe: "âš™ï¸", sh: "ðŸ“œ", bat: "ðŸ“œ",
    };
    return icons[ext || ""] || "ðŸ“„";
  };

  const renderTreeNode = (node: FileNode, depth: number = 0): React.ReactElement => {
    const isExpanded = expandedPaths.has(node.path);
    const isSelected = selectedPath === node.path;
    const matchesSearch = !searchQuery || node.name.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch && !node.isDirectory) {
      const hasMatchingChild = node.children?.some((c: FileNode) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      if (!hasMatchingChild) return <></>;
    }

    return (
      <div key={node.path} className="file-tree-node">
        <div
          className={`file-item ${isSelected ? "selected" : ""}`}
          style={{ paddingLeft: `${depth * 16 + 8}px` }}
          onClick={() => {
            setSelected(node.path);
            if (node.isDirectory) toggleExpand(node.path);
          }}
        >
          <span className="file-icon">
            {node.isDirectory ? (isExpanded ? "ðŸ“‚" : "ðŸ“") : getFileIcon(node.name)}
          </span>
          <span className="file-name">{node.name}</span>
          {!node.isDirectory && node.size !== undefined && (
            <span className="file-size">{formatBytes(node.size)}</span>
          )}
          {node.modifiedAt && (
            <span className="file-date">{formatDate(node.modifiedAt)}</span>
          )}
        </div>
        {node.isDirectory && isExpanded && node.children && (
          <div className="file-children">
            {node.children.map((child: FileNode) => renderTreeNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const findNode = (findTree: FileNode | null, path: string | null): FileNode | null => {
    if (!findTree || !path) return null;
    if (findTree.path === path) return findTree;
    if (findTree.children) {
      for (const child of findTree.children) {
        const found = findNode(child, path);
        if (found) return found;
      }
    }
    return null;
  };

  const selectedNode = findNode(tree, selectedPath);

  return (
    <div className="page">
      <div className="page-header">
        <h2>ðŸ“ Fichiers</h2>
        <div className="page-actions">
          <input
            type="text"
            className="search-input"
            placeholder="ðŸ” Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <div className="view-toggle">
            <button className={`btn btn-sm ${viewMode === "tree" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("tree")}>
              ðŸŒ² Arbre
            </button>
            <button className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-secondary"}`} onClick={() => setViewMode("grid")}>
              ðŸ“‹ Grille
            </button>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={refresh}>ðŸ”„</button>
          <button className="btn btn-primary btn-sm" onClick={handlePickDirectory}>
            ðŸ“‚ Ouvrir dossier
          </button>
        </div>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="files-layout">
        <div className="files-tree">
          {loading ? (
            <div className="loading-inline">Chargement...</div>
          ) : tree ? (
            renderTreeNode(tree)
          ) : (
            <EmptyState icon="ðŸ“" title="Aucun dossier ouvert" subtitle="Cliquez sur 'Ouvrir dossier' pour commencer" />
          )}
        </div>

        {selectedNode && (
          <div className="file-preview">
            <h3>{selectedNode.isDirectory ? "ðŸ“" : getFileIcon(selectedNode.name)} {selectedNode.name}</h3>
            <div className="file-details">
              <div className="detail-row">
                <span className="detail-label">Chemin:</span>
                <span className="detail-value">{selectedNode.path}</span>
              </div>
              <div className="detail-row">
                <span className="detail-label">Type:</span>
                <span className="detail-value">{selectedNode.isDirectory ? "Dossier" : "Fichier"}</span>
              </div>
              {selectedNode.size !== undefined && (
                <div className="detail-row">
                  <span className="detail-label">Taille:</span>
                  <span className="detail-value">{formatBytes(selectedNode.size)}</span>
                </div>
              )}
              {selectedNode.modifiedAt && (
                <div className="detail-row">
                  <span className="detail-label">ModifiÃ©:</span>
                  <span className="detail-value">{formatDate(selectedNode.modifiedAt)}</span>
                </div>
              )}
              {selectedNode.isDirectory && selectedNode.children && (
                <div className="detail-row">
                  <span className="detail-label">Contenu:</span>
                  <span className="detail-value">{selectedNode.children.length} Ã©lÃ©ment(s)</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
