import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import PropTypes from "prop-types";

const MIN_WEIGHT = 0.5;
const MAX_WEIGHT = 1.8;
const WEIGHT_STEP = 0.2;
const CENTER_PULL = 0.011;
const DAMPING = 0.94;
const COLLISION_PADDING = 12;

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const useContainerSize = (ref) => {
  const [size, setSize] = useState({ width: 640, height: 360 });
  useLayoutEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const { width, height } = entry.contentRect;
        if (width && height) setSize({ width, height });
      });
    });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  return size;
};

// --- This internal component will manage its own hover/edit state ---
function Bubble({
  node,
  onWeightChange,
  onLabelChange,
  onDeleteBubble,
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.label);

  const handleWeightClick = () => {
    const newWeight =
      node.weight + WEIGHT_STEP > MAX_WEIGHT
        ? MIN_WEIGHT
        : node.weight + WEIGHT_STEP;
    onWeightChange(node.id, parseFloat(newWeight.toFixed(2)));
  };

  const handleEditClick = (e) => {
    e.stopPropagation(); // Don't trigger weight change
    setEditValue(node.label);
    setIsEditing(true);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation(); // Don't trigger weight change
    onDeleteBubble(node.id);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (editValue.trim() && editValue !== node.label) {
      onLabelChange(node.id, editValue);
    }
    setIsEditing(false);
  };

  // Prevent simulation from running while editing
  useEffect(() => {
    node.vx = 0;
    node.vy = 0;
  }, [isEditing, node]);

  return (
    <div
      className="focus-ring group absolute flex transform-gpu flex-col items-center justify-center rounded-full border-2 border-primary/60 bg-primary/20 text-center text-text-light shadow-lg transition-transform duration-200"
      style={{
        width: node.radius * 2,
        height: node.radius * 2,
        left: node.x - node.radius,
        top: node.y - node.radius,
        zIndex: isHovered || isEditing ? 10 : 1,
      }}
      onMouseEnter={() => !isEditing && setIsHovered(true)}
      onMouseLeave={() => !isEditing && setIsHovered(false)}
    >
      {/* --- Edit Mode (Req #3) --- */}
      {isEditing ? (
        <form onSubmit={handleEditSubmit} className="w-full px-4">
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full rounded-lg border border-primary bg-[#111] p-1 text-center text-sm"
            autoFocus
            onBlur={handleEditSubmit}
          />
        </form>
      ) : (
        <>
          {/* --- Standard Display --- */}
          <span
            className="px-6 text-lg font-medium capitalize tracking-wide cursor-pointer"
            onClick={handleWeightClick} // Click text to change weight
          >
            {node.label}
          </span>
          <span className="pointer-events-none mt-2 rounded-full bg-[#111111]/80 px-4 py-1 text-xs font-semibold uppercase tracking-caps text-text-muted">
            {Math.round(node.weight * 100)}%
          </span>

          {/* --- Hover Controls (Req #2 & #3) --- */}
          {isHovered && (
            <div className="absolute -bottom-4 flex gap-2">
              <button
                type="button"
                onClick={handleEditClick}
                className="rounded-full bg-surface px-3 py-1 text-xs text-text-light transition hover:bg-text-light hover:text-bg"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleDeleteClick}
                className="rounded-full bg-surface px-3 py-1 text-xs text-primary transition hover:bg-primary hover:text-bg"
              >
                Delete
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// --- Main Canvas Component ---
function BubbleCanvas({
  bubbleConcepts, // Renamed from conceptTuples
  onWeightChange,
  onLabelChange,
  onDeleteBubble,
}) {
  const containerRef = useRef(null);
  const animationRef = useRef(null);
  const size = useContainerSize(containerRef);

  const [nodes, setNodes] = useState([]);

  // Create nodes when bubbleConcepts or size changes
  useEffect(() => {
    const { width, height } = size;
    const centerX = width / 2;
    const centerY = height / 2;

    setNodes((prevNodes) => {
      const existing = new Map(prevNodes.map((node) => [node.id, node]));
      return bubbleConcepts.map((concept) => {
        const clampedWeight = clamp(concept.weight, MIN_WEIGHT, MAX_WEIGHT);
        const radius = 60 + clampedWeight * 60;
        const matched = existing.get(concept.id);

        return {
          ...concept,
          radius,
          x: matched?.x || centerX + (Math.random() - 0.5) * 100,
          y: matched?.y || centerY + (Math.random() - 0.5) * 100,
          vx: matched?.vx || 0,
          vy: matched?.vy || 0,
        };
      });
    });
  }, [bubbleConcepts, size]);

  // Physics simulation
  useEffect(() => {
    const simulate = () => {
      setNodes((prev) => {
        const next = prev.map((node) => ({ ...node }));
        const contributions = Array.from({ length: next.length }, () => ({
          x: 0,
          y: 0,
          count: 0,
        }));
        const centerX = size.width / 2;
        const centerY = size.height / 2;

        next.forEach((node) => {
          const dx = centerX - node.x;
          const dy = centerY - node.y;
          node.vx += dx * CENTER_PULL;
          node.vy += dy * CENTER_PULL;
        });

        for (let i = 0; i < next.length; i += 1) {
          for (let j = i + 1; j < next.length; j += 1) {
            const a = next[i];
            const b = next[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 0.001;
            const minDistance = a.radius + b.radius + COLLISION_PADDING;

            if (distance < minDistance) {
              const overlap = (minDistance - distance) / distance;
              const pushX = dx * overlap;
              const pushY = dy * overlap;

              contributions[i].x -= pushX;
              contributions[i].y -= pushY;
              contributions[i].count += 1;
              contributions[j].x += pushX;
              contributions[j].y += pushY;
              contributions[j].count += 1;
            }
          }
        }

        next.forEach((node, index) => {
          const contribution = contributions[index];
          if (contribution.count > 0) {
            node.vx += contribution.x / contribution.count;
            node.vy += contribution.y / contribution.count;
          }

          node.vx *= DAMPING;
          node.vy *= DAMPING;
          node.x += node.vx;
          node.y += node.vy;

          const paddingX = size.width * 0.1;
          const paddingY = size.height * 0.12;
          const maxX = size.width - node.radius - paddingX;
          const maxY = size.height - node.radius - paddingY;
          const minX = node.radius + paddingX;
          const minY = node.radius + paddingY;

          if (node.x < minX) {
            node.x = minX;
            node.vx = Math.abs(node.vx) * 0.35;
          } else if (node.x > maxX) {
            node.x = maxX;
            node.vx = -Math.abs(node.vx) * 0.35;
          }
          if (node.y < minY) {
            node.y = minY;
            node.vy = Math.abs(node.vy) * 0.35;
          } else if (node.y > maxY) {
            node.y = maxY;
            node.vy = -Math.abs(node.vy) * 0.35;
          }
        });
        return next;
      });
      animationRef.current = requestAnimationFrame(simulate);
    };
    animationRef.current = requestAnimationFrame(simulate);
    return () => cancelAnimationFrame(animationRef.current);
  }, [size]);

  return (
    <section className="relative overflow-hidden rounded-3xl bg-surface/70 px-6 py-10 shadow-glow backdrop-blur">
      <header className="mb-6 text-center">
        <p className="text-sm uppercase tracking-caps text-text-muted">
          Refine the vibe
        </p>
        <h2 className="text-3xl text-text-light">
          Tap text to change weight
        </h2>
      </header>
      <div
        ref={containerRef}
        className="relative mx-auto h-[600px] max-w-6xl overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-transparent to-primary/5"
      >
        {nodes.map((node) => (
          <Bubble
            key={node.id}
            node={node}
            onWeightChange={onWeightChange}
            onLabelChange={onLabelChange}
            onDeleteBubble={onDeleteBubble}
          />
        ))}
      </div>
    </section>
  );
}

BubbleCanvas.propTypes = {
  bubbleConcepts: PropTypes.array.isRequired,
  onWeightChange: PropTypes.func.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onDeleteBubble: PropTypes.func.isRequired,
};

Bubble.propTypes = {
  node: PropTypes.object.isRequired,
  onWeightChange: PropTypes.func.isRequired,
  onLabelChange: PropTypes.func.isRequired,
  onDeleteBubble: PropTypes.func.isRequired,
};

export default BubbleCanvas;