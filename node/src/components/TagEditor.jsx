import React, { useState } from "react";
import PropTypes from "prop-types";

/**
 * A component to edit a list of string tags.
 */
function TagEditor({ title, category, activeTags, onAddTag, onDeleteTag }) {
  const [newTag, setNewTag] = useState("");

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newTag.trim() || activeTags.includes(newTag)) {
      setNewTag("");
      return;
    }
    onAddTag(category, newTag);
    setNewTag("");
  };

  return (
    <div className="flex flex-col gap-3 text-left">
      <span className="text-sm uppercase tracking-caps text-text-muted">
        {title}
      </span>
      {/* --- List of Active Tags --- */}
      <div className="flex flex-wrap gap-2">
        {activeTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => onDeleteTag(category, tag)}
            // --- MODIFIED: Added 'lowercase' class ---
            className="rounded-full bg-primary/30 px-4 py-2 text-sm text-text-light transition hover:bg-primary/10 lowercase"
          >
            {tag} <span className="ml-2 text-primary">×</span>
          </button>
        ))}
      </div>
      {/* --- Add New Tag Form --- */}
      <form onSubmit={handleAddSubmit} className="flex gap-3">
        <input
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add a new tag..."
          className="flex-1 rounded-2xl border border-transparent bg-[#1f1f1f] px-5 py-3 text-sm text-text-light transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          type="text"
        />
        <button
          type="submit"
          className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-light transition hover:bg-primary-dark"
        >
          Add
        </button>
      </form>
    </div>
  );
}

TagEditor.propTypes = {
  title: PropTypes.string.isRequired,
  category: PropTypes.string.isRequired,
  activeTags: PropTypes.arrayOf(PropTypes.string).isRequired,
  onAddTag: PropTypes.func.isRequired,
  onDeleteTag: PropTypes.func.isRequired,
};

export default TagEditor;