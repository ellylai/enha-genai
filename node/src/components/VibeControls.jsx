import React, { useState } from "react";
import PropTypes from "prop-types";
import TagEditor from "./TagEditor"; // --- IMPORT ---

function VibeControls({
  vibeData,
  onStyleChange,
  onAddNewBubble,
  onAddTag,     // --- ADD ---
  onDeleteTag,  // --- ADD ---
}) {
  const [newCategory, setNewCategory] = useState("mood");
  const [newLabel, setNewLabel] = useState("");
  const [newWeight, setNewWeight] = useState(1.0);

  const handleStyleEdit = (e) => {
    onStyleChange(e.target.value);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    if (!newLabel.trim()) return;
    onAddNewBubble({
      category: newCategory,
      label: newLabel,
      weight: parseFloat(newWeight),
    });
    setNewLabel("");
    setNewWeight(1.0);
  };

  return (
    // --- UPDATED: Changed grid to 1 column to stack all controls ---
    <section className="grid grid-cols-1 md:grid-cols-2 gap-8 rounded-3xl bg-surface/70 p-8 shadow-glow backdrop-blur">
      
      {/* --- Left Column for Toggles/Inputs --- */}
      <div className="flex flex-col gap-6">
        {/* --- Style Editor (Req #1) --- */}
        <label className="flex flex-col gap-2 text-left">
          <span className="text-sm uppercase tracking-caps text-text-muted">
            1. Edit Style
          </span>
          <input
            value={vibeData?.style || ""}
            onChange={handleStyleEdit}
            placeholder="e.g., blurry film photo..."
            className="w-full rounded-2xl border border-transparent bg-[#1f1f1f] px-5 py-4 text-base text-text-light transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            type="text"
          />
        </label>

        {/* --- NEW: Tag Editor for Lighting --- */}
        <TagEditor
          title="2. Lighting"
          category="lighting"
          activeTags={vibeData?.lighting || []}
          onAddTag={onAddTag}
          onDeleteTag={onDeleteTag}
        />

        {/* --- NEW: Tag Editor for Time of Day --- */}
        <TagEditor
          title="3. Time of Day"
          category="time"
          activeTags={vibeData?.time || []}
          onAddTag={onAddTag}
          onDeleteTag={onDeleteTag}
        />
      </div>

      {/* --- Right Column for Adding Bubbles --- */}
      <form onSubmit={handleAddSubmit} className="flex flex-col gap-3 text-left">
        <span className="text-sm uppercase tracking-caps text-text-muted">
          4. Add New Concept Bubble
        </span>
        <div className="flex flex-col md:flex-row gap-3">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            className="rounded-2xl border border-transparent bg-[#1f1f1f] px-5 py-4 text-base text-text-light transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="mood">Mood</option>
            <option value="colors">Color</option>
            <option value="objects">Object</option>
          </select>
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New Label (e.g., 'Rain')"
            className="flex-1 rounded-2xl border border-transparent bg-[#1f1f1f] px-5 py-4 text-base text-text-light transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40"
            type="text"
            required
          />
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.2"
            value={newWeight}
            onChange={(e) => setNewWeight(e.target.value)}
            className="flex-1"
          />
          <span className="text-text-muted w-16 text-right">{Math.round(newWeight * 100)}%</span>
          <button
            type="submit"
            className="rounded-2xl bg-primary px-5 py-2 text-sm font-semibold uppercase tracking-wide text-light transition hover:bg-primary-dark"
          >
            Add
          </button>
        </div>
      </form>
    </section>
  );
}

VibeControls.propTypes = {
  vibeData: PropTypes.object,
  onStyleChange: PropTypes.func.isRequired,
  onAddNewBubble: PropTypes.func.isRequired,
  onAddTag: PropTypes.func.isRequired,      // --- ADD ---
  onDeleteTag: PropTypes.func.isRequired,   // --- ADD ---
};

export default VibeControls;