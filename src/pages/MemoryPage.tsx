import { useState } from "react";
import { useMemoryStore } from "../stores/memoryStore";
import { useToast, EmptyState, Modal } from "../components/ui";
import type { MemoryEntry, MemorySearchResult } from "../types";

export default function MemoryPage() {
  const {
    entries, addEntry, updateEntry, deleteEntry,
    searchQuery, setSearchQuery, selectedTags, toggleTag,
    getAllTags, getFilteredEntries, search,
  } = useMemoryStore();
  const { addToast } = useToast();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingEntry, setEditingEntry] = useState<MemoryEntry | null>(null);
  const [newEntry, setNewEntry] = useState({ key: "", value: "", tags: "", importance: 3 });
  const [searchResults, setSearchResults] = useState<MemorySearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const allTags = getAllTags();
  const filteredEntries = getFilteredEntries();

  const handleSearch = () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    const results = search(searchQuery);
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleAddEntry = () => {
    if (!newEntry.key.trim() || !newEntry.value.trim()) {
      addToast({ type: "error", message: "Clé et valeur requises" });
      return;
    }
    addEntry({
      key: newEntry.key.trim(),
      value: newEntry.value.trim(),
      tags: newEntry.tags.split(",").map(t => t.trim()).filter(Boolean),
      importance: newEntry.importance,
    });
    setNewEntry({ key: "", value: "", tags: "", importance: 3 });
    setShowAddModal(false);
    addToast({ type: "success", message: `Mémoire ajoutée: ${newEntry.key}` });
  };

  const handleUpdateEntry = () => {
    if (!editingEntry) return;
    updateEntry(editingEntry.id, {
      key: editingEntry.key,
      value: editingEntry.value,
      tags: editingEntry.tags,
      importance: editingEntry.importance,
    });
    setEditingEntry(null);
    addToast({ type: "success", message: "Entrée mise à jour" });
  };

  const handleDeleteEntry = (id: string) => {
    deleteEntry(id);
    addToast({ type: "info", message: "Entrée supprimée" });
  };

  const displayEntries = searchQuery.trim() ? searchResults.map(r => r.entry) : filteredEntries;

  return (
    <div className="page">
      <div className="page-header">
        <h2>🧠 Mémoire ({entries.length} entrées)</h2>
        <div className="page-actions">
          <div className="search-with-button">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Recherche intelligente (FTS)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleSearch(); }}
            />
            <button className="btn btn-primary btn-sm" onClick={handleSearch}>🔍</button>
          </div>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
            + Ajouter
          </button>
        </div>
      </div>

      {/* Tags filter */}
      {allTags.length > 0 && (
        <div className="tags-filter">
          <span className="tags-label">Tags:</span>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`tag-chip ${selectedTags.includes(tag) ? "active" : ""}`}
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
          {selectedTags.length > 0 && (
            <button className="btn btn-xs btn-secondary" onClick={() => selectedTags.forEach(t => toggleTag(t))}>
              Effacer filtres
            </button>
          )}
        </div>
      )}

      {/* Search results info */}
      {searchQuery.trim() && (
        <div className="search-results-info">
          {isSearching ? "Recherche..." : `${searchResults.length} résultat(s) pour "${searchQuery}"`}
        </div>
      )}

      <div className="memory-grid">
        {displayEntries.length === 0 && (
          <EmptyState
            icon="🧠"
            title={searchQuery ? "Aucun résultat" : "Mémoire vide"}
            subtitle={searchQuery ? "Essayez d'autres mots-clés" : "Ajoutez votre première entrée mémoire"}
          />
        )}
        {displayEntries.map((entry) => {
          const searchResult = searchResults.find(r => r.entry.id === entry.id);
          return (
            <div key={entry.id} className="memory-card">
              <div className="memory-card-header">
                <h4>
                  {entry.key}
                  {entry.importance && entry.importance >= 4 && <span className="importance-badge">⭐</span>}
                  {entry.source && <span className="source-badge">{entry.source}</span>}
                </h4>
                <div className="memory-card-actions">
                  <button className="btn btn-xs btn-secondary" onClick={() => setEditingEntry({ ...entry })}>✏️</button>
                  <button className="btn btn-xs btn-danger" onClick={() => handleDeleteEntry(entry.id)}>🗑️</button>
                </div>
              </div>
              {searchResult?.snippet && searchQuery.trim() ? (
                <p className="memory-snippet">{searchResult.snippet}</p>
              ) : (
                <p className="memory-value">{entry.value.slice(0, 200)}{entry.value.length > 200 ? "..." : ""}</p>
              )}
              {entry.tags.length > 0 && (
                <div className="memory-tags">
                  {entry.tags.map(tag => (
                    <span key={tag} className="tag-chip small" onClick={() => toggleTag(tag)}>#{tag}</span>
                  ))}
                </div>
              )}
              <div className="memory-meta">
                {new Date(entry.createdAt).toLocaleDateString("fr-FR")}
                {entry.updatedAt !== entry.createdAt && ` | Modifié: ${new Date(entry.updatedAt).toLocaleDateString("fr-FR")}`}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Ajouter à la mémoire">
        <div className="form-group">
          <label>Clé</label>
          <input type="text" placeholder="ex: api_key_ovh" value={newEntry.key}
            onChange={(e) => setNewEntry({ ...newEntry, key: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Valeur</label>
          <textarea rows={4} placeholder="Le contenu à retenir..." value={newEntry.value}
            onChange={(e) => setNewEntry({ ...newEntry, value: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Tags (séparés par virgules)</label>
          <input type="text" placeholder="ex: api, vps, credential" value={newEntry.tags}
            onChange={(e) => setNewEntry({ ...newEntry, tags: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Importance (1-5)</label>
          <input type="range" min="1" max="5" value={newEntry.importance}
            onChange={(e) => setNewEntry({ ...newEntry, importance: parseInt(e.target.value) })} />
          <span>{newEntry.importance}/5</span>
        </div>
        <div className="modal-actions">
          <button className="btn btn-secondary" onClick={() => setShowAddModal(false)}>Annuler</button>
          <button className="btn btn-primary" onClick={handleAddEntry}>Ajouter</button>
        </div>
      </Modal>

      {/* Edit Modal */}
      {editingEntry && (
        <Modal isOpen={true} onClose={() => setEditingEntry(null)} title="Modifier l'entrée">
          <div className="form-group">
            <label>Clé</label>
            <input type="text" value={editingEntry.key}
              onChange={(e) => setEditingEntry({ ...editingEntry, key: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Valeur</label>
            <textarea rows={6} value={editingEntry.value}
              onChange={(e) => setEditingEntry({ ...editingEntry, value: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Tags</label>
            <input type="text" value={editingEntry.tags.join(", ")}
              onChange={(e) => setEditingEntry({ ...editingEntry, tags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })} />
          </div>
          <div className="modal-actions">
            <button className="btn btn-secondary" onClick={() => setEditingEntry(null)}>Annuler</button>
            <button className="btn btn-primary" onClick={handleUpdateEntry}>Enregistrer</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
